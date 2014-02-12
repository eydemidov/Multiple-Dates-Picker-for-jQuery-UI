/*
 * MultiDatesPicker v1.6.1
 * http://multidatespickr.sourceforge.net/
 * 
 * Copyright 2011, Luca Lauretta
 * Dual licensed under the MIT or GPL version 2 licenses.
 */
(function( $ ){
	$.extend($.ui, { multiDatesPicker: { version: "1.6.1" } });

	$.fn.multiDatesPicker = function(method) {
		var mdp_arguments = arguments;
		var ret = this;
		var today_date = new Date();
		var day_zero = new Date(0);
		var mdp_events = {};
		
		function removeDate(date, type) {
			if(!type) type = 'picked';
			date = dateConvert.call(this, date);
			for(var i in this.multiDatesPicker.dates[type])
				if(!methods.compareDates(this.multiDatesPicker.dates[type][i], date))
					return this.multiDatesPicker.dates[type].splice(i, 1).pop();
		}
		function removeIndex(index, type) {
			if(!type) type = 'picked';
			return this.multiDatesPicker.dates[type].splice(index, 1).pop();
		}
		function addDate(date, type, no_sort) {
			if(!type) type = 'picked';
			date = dateConvert.call(this, date);
			
			// @todo: use jQuery UI datepicker method instead
			date.setHours(0);
			date.setMinutes(0);
			date.setSeconds(0);
			date.setMilliseconds(0);
			
			if (methods.gotDate.call(this, date, type) === false) {
				this.multiDatesPicker.dates[type].push(date);
				if(!no_sort) this.multiDatesPicker.dates[type].sort(methods.compareDates);
			} 
		}
		function sortDates(type) {
			if(!type) type = 'picked';
			this.multiDatesPicker.dates[type].sort(methods.compareDates);
		}
		function dateConvert(date, desired_type, date_format) {
			if(!desired_type) desired_type = 'object';
			return methods.dateConvert.call(this, date, desired_type, date_format);
		}
		
		var methods = {
			init : function( options ) {
				var $this = $(this);
				this.multiDatesPicker.changed = false;
				var mdp_events = {
					beforeShow: function(input, inst) {
						this.multiDatesPicker.changed = false;
						if(this.multiDatesPicker.originalBeforeShow) 
							this.multiDatesPicker.originalBeforeShow.call(this, input, inst);
					},
					onSelect : function(dateText, inst) {
						var $this = $(this);
						var picker = this.multiDatesPicker;
						picker.changed = true;

						if (dateText) {
							$this.multiDatesPicker('toggleDate', dateText);
						}

						var firstPicked = picker.dates.picked[0];
						$(this).find("option").prop('disabled', false);

						if (picker.mode === 'rangeSelection') {
							if (!picker.startRangeSelection) {
								picker.startRangeSelection = dateText;
							} else if (dateText == picker.startRangeSelection) {
								picker.startRangeSelection = null;
								picker.endRangeSelection = null;
							} else {
								picker.endRangeSelection = dateText;

								var startDate = new Date(picker.startRangeSelection);
								var endDate = new Date(picker.endRangeSelection);
								picker.rangeDisabledConflict = methods.countDisabled.apply(this, [startDate, endDate]) ? true : false;
							}
						}

						if (picker.mode === 'daysRange') {
							var endSelection = picker.autoselectRange[1];
							var startDate = new Date(dateText);
							var endDate = new Date(startDate.getTime() + endSelection * 24 * 60 * 60 * 1000);
							picker.rangeDisabledConflict = methods.countDisabled.apply(this, [startDate, endDate]) ? true : false;
						}

						if (picker.dates.picked.length > 0) {
							// pickableRange and enableRecurring - incompatible options, Recurring will rewrite.
							if (picker.pickableRange) {
								var minDate = firstPicked,
									maxDate = new Date(minDate.getTime());
								methods.disableRange.apply(this, [minDate, maxDate])
							}

							if (picker.enableRecurring) {
								var dates = methods.setRecurring.apply(this, [firstPicked, picker]);
								var minDate = dates.minDate;
								var maxDate = dates.maxDate;
							}
						}

						$this
							.datepicker("option", "minDate", minDate || picker.minDate)
							.datepicker("option", "maxDate", maxDate || picker.maxDate);

						if(this.tagName == 'INPUT') { // for inputs
							$this.val(
								$this.multiDatesPicker('getDates', 'string')
							);
						}
						
						if(picker.originalOnSelect && dateText)
							picker.originalOnSelect.call(this, dateText, inst);
						
						// START aqisnotliquid
						// Allows for the following tags to act as altField - input, textarea, p, span, div
						var altFieldId = $this.datepicker('option', 'altField');
						var dateString = $this.multiDatesPicker('getDates', 'string');
						
						if (altFieldId != undefined && altFieldId != "") {
							if($('*').find(altFieldId).is('input, textarea')) {
								$(altFieldId).val(dateString);
							} else {
								//$(altFieldId).empty().text(dateString); Original
								$(altFieldId).text(dateString); // May not work in <IE8
							}
						}
						// END aqisnotliquid
					},
					beforeShowDay : function(date) {
						var $this = $(this),
							gotThisDate = $this.multiDatesPicker('gotDate', date) !== false,
							isDisabledCalendar = $this.datepicker('option', 'disabled'),
							isDisabledDate = $this.multiDatesPicker('gotDate', date, 'disabled') !== false,
							areAllSelected = this.multiDatesPicker.maxPicks == this.multiDatesPicker.dates.picked.length;
						
						var custom = [true, ''];
						if(this.multiDatesPicker.originalBeforeShowDay)
							custom = this.multiDatesPicker.originalBeforeShowDay.call(this, date);
						
						var highlight_class = gotThisDate ? 'ui-state-highlight' : custom[1];
						var selectable_date = !(isDisabledCalendar || isDisabledDate || (areAllSelected && !highlight_class));
						return [selectable_date && custom[0], highlight_class];
					},
					onClose: function(dateText, inst) {
						if(this.tagName == 'INPUT' && this.multiDatesPicker.changed) {
							$(inst.dpDiv[0]).stop(false,true);
							setTimeout('$("#'+inst.id+'").datepicker("show")',50);
						}
						if(this.multiDatesPicker.originalOnClose) this.multiDatesPicker.originalOnClose.call(this, dateText, inst);
					}
				};
				
				if(options) {
					this.multiDatesPicker.originalBeforeShow = options.beforeShow;
					this.multiDatesPicker.originalOnSelect = options.onSelect;
					this.multiDatesPicker.originalBeforeShowDay = options.beforeShowDay;
					this.multiDatesPicker.originalOnClose = options.onClose;
					
					$this.datepicker(options);

					this.multiDatesPicker.minDate = $.datepicker._determineDate(this, options.minDate, null);
					this.multiDatesPicker.maxDate = $.datepicker._determineDate(this, options.maxDate, null);
					
					if(options.addDates) methods.addDates.call(this, options.addDates);
					if(options.addDisabledDates)
						methods.addDates.call(this, options.addDisabledDates, 'disabled');
					if(options.enableRecurring) {
						methods.constructRecurPanel.call(this, this.multiDatesPicker, mdp_events.onSelect);
						this.multiDatesPicker.initialRecurDates = [];
						this.multiDatesPicker.recurDates = [];
						this.multiDatesPicker.fakeDisabledDates = [];
					}
					if(options.showRangeOnHover) {
						methods.handleOnHover.call(this, this.multiDatesPicker);
					}
					
					methods.setMode.call(this, options);
				} else {
					$this.datepicker();
				}
				
				$this.datepicker('option', mdp_events);
				
				if(this.tagName == 'INPUT') $this.val($this.multiDatesPicker('getDates', 'string'));
				
				// Fixes the altField filled with defaultDate by default
				var altFieldOption = $this.datepicker('option', 'altField');
				if (altFieldOption) $(altFieldOption).val($this.multiDatesPicker('getDates', 'string'));
			},
			handleOnHover: function(picker) {
				var that = this;
				$(this).on('mouseenter', 'td', function() {
					if (picker.startRangeSelection) {
						picker.hlColor = picker.hlColor || window.getComputedStyle($(that).find('.ui-state-highlight')[0]).backgroundColor;
						var data = $(this).data();
						var year = data.year;
						var month = data.month;
						var day = $(this).find('a').text();
						methods.highlightRange.apply(that, [new Date(picker.startRangeSelection), new Date(year, month, day), picker.hlColor]);
					}
				});
				$(this).on('mouseleave', function() {
					$(this).find('td').css({
						background: '',
						opacity: ''
					});
				})
			},
			highlightRange: function(date1, date2, color) {
				// Make the earliest date date1;
				if (date1 > date2) {
					var originalDate = date1;
					date1 = date2;
					date2 = originalDate;
				}

				$.each($(this).find('td'), function() {
					var day = new Date($(this).data('year'), $(this).data('month'), parseInt($(this).text(), 10));
					// Do not highlight the starting date;
					if (day >= date1 && day <= date2 && day.getTime() != (originalDate || date1).getTime()) {
						$(this).css({
							background: color,
							opacity:  0.35
						});
					} else {
						$(this).css({
							background: '',
							opacity: ''
						});
					}
				});
			},
			setRecurring: function(firstPicked, picker) {
				//Set pickable range;
				var year = firstPicked.getFullYear();
				var month = firstPicked.getMonth();
				var day = firstPicked.getDay();

				var weekMinDate = new Date(year, month, firstPicked.getDate() - day);
				var weekMaxDate = new Date(year, month, firstPicked.getDate() + (6 - day));

				var monthMinDate = new Date(year, month, 1);
				var monthMaxDate = new Date(year, month, methods.getNumberOfDays(year, month));

				var yearMinDate = new Date(year, 0, 1);
				var yearMaxDate = new Date(year, 11, methods.getNumberOfDays(year, 11));

				var minDate = null;
				var maxDate = null;

				// Remove all previously picked/restricted dates;
				methods.removeDates.apply(this, [picker.recurDates, 'picked']);
				methods.removeDates.apply(this, [picker.fakeDisabledDates, 'disabled']);
				picker.recurDates = [];
				picker.fakeDisabledDates = [];
				switch (picker.recurringPeriod) {
					case 'week': {
						minDate = weekMinDate;
						maxDate = yearMaxDate;

						picker.initialRecurDates = methods.keepInitialRecurDates(minDate, maxDate, picker.dates.picked);
						if (picker.initialRecurDates.length > 0) {
							// A hack to allow picking disabled months;
							picker.fakeDisabledDates = methods.getDatesBetween((new Date(weekMaxDate.getTime() + (24 * 60 * 60 * 1000))), yearMaxDate);
							methods.addDates.call(this, picker.fakeDisabledDates, 'disabled');

							// This is where the recurring happens;
							for (var i in picker.initialRecurDates) {

								var day = picker.initialRecurDates[i];

								var d = new Date(day.getTime() + (7 * 24 * 60 * 60 * 1000));
								while (d <= yearMaxDate) {
									picker.recurDates.push(d);
									d = new Date(d.getTime() + (7 * 24 * 60 * 60 * 1000));
								}
								methods.addDates.apply(this, [picker.recurDates, 'picked']);
							}
						}
						break;
					}
					case 'month': {
						minDate = monthMinDate;
						maxDate = yearMaxDate;

						picker.initialRecurDates = methods.keepInitialRecurDates(minDate, maxDate, picker.dates.picked);
						if (picker.initialRecurDates.length > 0) {
							// A hack to allow picking disabled months;
							picker.fakeDisabledDates = methods.getDatesBetween((new Date(monthMaxDate.getTime() + (24 * 60 * 60 * 1000))), yearMaxDate);
							methods.addDates.call(this, picker.fakeDisabledDates, 'disabled');

							// This is where the recurring happens;
							for (var i in picker.initialRecurDates) {

								var day = picker.initialRecurDates[i];
								var year = day.getFullYear();
								var date = day.getDate();

								var d;
								// Check if a next month has a date;
								if (new Date(year, day.getMonth() + 2, 0).getDate() >= date) {
									d = new Date(year, day.getMonth() + 1, date);
								} else {
									// Create new date with first day just to get proper month for next dates;
									d = new Date(year, day.getMonth() + 1, 1);
								}
								while (d <= yearMaxDate) {
									if (d.getDate() === date) {
										picker.recurDates.push(d);
									}

									if (new Date(year, d.getMonth() + 2, 0).getDate() >= date) {
										d = new Date(year, d.getMonth() + 1, date);
									} else {
										d = new Date(year, d.getMonth() + 1, 1);
									}
								}
								methods.addDates.apply(this, [picker.recurDates, 'picked']);
							}
						}
						break;
					}
					case 'year': {
						minDate = yearMinDate;
						maxDate = yearMaxDate;

						picker.initialRecurDates = methods.keepInitialRecurDates(minDate, maxDate, picker.dates.picked);
						break;
					}
					default: {
						// No recur dates if no recur period;
						picker.initialRecurDates = [];
					}
				}

				// Disable the select options;
				for (var i = 0; i < picker.initialRecurDates.length; i++) {
					if (picker.initialRecurDates[i] > yearMaxDate || picker.initialRecurDates[i] < yearMinDate)	{
						$(this).find("option[value=year], option[value=month], option[value=week]").prop('disabled', true);
						break;
					} else if (picker.initialRecurDates[i] > monthMaxDate || picker.initialRecurDates[i] < monthMinDate) {
						$(this).find("option[value=month], option[value=week]").prop('disabled', true);
						break;
					} else if (picker.initialRecurDates[i] > weekMaxDate || picker.initialRecurDates[i] < weekMinDate) {
						$(this).find("option[value=week]").prop('disabled', true);
						break;
					}
				}

				// If anything is actually chosen, pass the picking boundaries;
				if (picker.initialRecurDates.length > 0) {
					return {minDate: minDate, maxDate: maxDate};
				} else {
					return {minDate: null, maxDate: null};
				}
			},
			keepInitialRecurDates: function(minDate, maxDate, pickedDates) {
				var arr = [];
				if (minDate && maxDate) {
					for (var i = 0; i < pickedDates.length; i++) {
						if (pickedDates[i] <= maxDate && pickedDates[i] >= minDate)	{
							arr.push(pickedDates[i]);
						}
					}
					return arr;
				} else {
					return [];
				}

			},
			getNumberOfDays: function(year, month) {
				return new Date(year, month + 1, 0).getDate();
			},
			constructRecurPanel: function(picker, triggerSelect) {
				var bar = $('<div class="mdp-recur-panel"><label for="mdp-recur">Recur: <select name="mdp-recur">' +
					'<option value="none">None</option>' +
					'<option value="week">Weekly</option>' +
					'<option value="month">Monthly</option>' +
					'<option value="year" selected>Yearly</option>' +
					'</select><button class="mdp-clear">Clear</button></label></div>');
				$(this).append(bar);
				var that = this;

				picker.recurringPeriod = bar.find('select').val();
				bar.find('select').on('change', function() {
					picker.recurringPeriod = $(this).val();
					triggerSelect.call(that);
				});
				bar.find('.mdp-clear').on('click', function() {
					if (picker.startRangeSelection) {
						picker.startRangeSelection = null;
					}

					var dates = picker.dates.picked.slice(0);
					methods.removeDates.call(that, dates);
					methods.removeDates.apply(that, [picker.fakeDisabledDates, 'disabled']);
					triggerSelect.call(that);
				});
			},
			getRangeDisabledConflict: function() {
				return this.multiDatesPicker.rangeDisabledConflict;
			},
			countDisabled: function(date1, date2, disabled) {
				// Make the earliest date date1;
				if (date1 > date2) {
					var tmp = date1;
					date1 = date2;
					date2 = tmp;
				}

				var picker = this.multiDatesPicker;
				var c_disabled;
					disabled = disabled || picker.dates.disabled.slice(0);

				c_disabled = 0;
				for(var i = 0; i < disabled.length; i++) {
					if(disabled[i].getTime() <= date2.getTime()) {
						if((date1.getTime() <= disabled[i].getTime()) && (disabled[i].getTime() <= date2.getTime()) ) {
							c_disabled++;
						}
						disabled.splice(i, 1);
						i--;
					}
				}
				return c_disabled;
			},
			disableRange: function(minDate, maxDate) {
				var $this = $(this);
				var picker = this.multiDatesPicker;
				methods.sumDays(maxDate, picker.pickableRange-1);

				if(picker.adjustRangeToDisabled) {
					var c_disabled;
					var disabled = picker.dates.disabled.slice(0);
					do {
						c_disabled = methods.countDisabled.apply(this, [minDate, maxDate, disabled]);
						maxDate.setDate(maxDate.getDate() + c_disabled);
					} while(c_disabled != 0);
				}

				if(picker.maxDate && (maxDate > picker.maxDate))
					maxDate = picker.maxDate;
				$this
					.datepicker("option", "minDate", minDate)
					.datepicker("option", "maxDate", maxDate);
			},
			compareDates : function(date1, date2) {
				date1 = dateConvert.call(this, date1);
				date2 = dateConvert.call(this, date2);
				// return > 0 means date1 is later than date2 
				// return == 0 means date1 is the same day as date2 
				// return < 0 means date1 is earlier than date2 
				var diff = date1.getFullYear() - date2.getFullYear();
				if(!diff) {
					diff = date1.getMonth() - date2.getMonth();
					if(!diff) 
						diff = date1.getDate() - date2.getDate();
				}
				return diff;
			},
			getDatesBetween : function(date1, date2, disabledDates) {
				date1 = dateConvert.call(this, date1);
				date2 = dateConvert.call(this, date2);
				disabledDates = disabledDates || [];
				disabledDates = $.map(disabledDates, function(d) {
					return d.toString();
				})
				var dates = [];
				var tmpDate = date1;
				if (date1 < date2) {
					while (tmpDate <= date2) {
						var nDate = new Date(tmpDate);
						$.inArray(nDate.toString(), disabledDates) == -1 ? dates.push(nDate) : null;
						tmpDate = new Date(tmpDate.getTime() + (24 * 60 * 60 * 1000));;
					}
				} else {
					while (tmpDate >= date2) {
						var nDate = new Date(tmpDate);
						$.inArray(nDate.toString(), disabledDates) == -1 ? dates.push(nDate) : null;
						tmpDate = new Date(tmpDate.getTime() - (24 * 60 * 60 * 1000));;
					}
				}
				return dates;
			},
			sumDays : function( date, n_days ) {
				var origDateType = typeof date;
				obj_date = dateConvert.call(this, date);
				obj_date.setDate(obj_date.getDate() + n_days);
				return dateConvert.call(this, obj_date, origDateType);
			},
			dateConvert : function( date, desired_format, dateFormat ) {
				var from_format = typeof date;
				
				if(from_format == desired_format) {
					if(from_format == 'object') {
						try {
							date.getTime();
						} catch (e) {
							$.error('Received date is in a non supported format!');
							return false;
						}
					}
					return date;
				}
				
				var $this = $(this);
				if(typeof date == 'undefined') date = new Date(0);
				
				if(desired_format != 'string' && desired_format != 'object' && desired_format != 'number')
					$.error('Date format "'+ desired_format +'" not supported!');
				
				if(!dateFormat) {
					dateFormat = $.datepicker._defaults.dateFormat;
					
					// thanks to bibendus83 -> http://sourceforge.net/tracker/index.php?func=detail&aid=3213174&group_id=358205&atid=1495382
					var dp_dateFormat = $this.datepicker('option', 'dateFormat');
					if (dp_dateFormat) {
						dateFormat = dp_dateFormat;
					}
				}
				
				// converts to object as a neutral format
				switch(from_format) {
					case 'object': break;
					case 'string': date = $.datepicker.parseDate(dateFormat, date); break;
					case 'number': date = new Date(date); break;
					default: $.error('Conversion from "'+ desired_format +'" format not allowed on jQuery.multiDatesPicker');
				}
				// then converts to the desired format
				switch(desired_format) {
					case 'object': return date;
					case 'string': return $.datepicker.formatDate(dateFormat, date);
					case 'number': return date.getTime();
					default: $.error('Conversion to "'+ desired_format +'" format not allowed on jQuery.multiDatesPicker');
				}
				return false;
			},
			gotDate : function( date, type ) {
				if(!type) type = 'picked';
				for(var i = 0; i < this.multiDatesPicker.dates[type].length; i++) {
					if(methods.compareDates.call(this, this.multiDatesPicker.dates[type][i], date) === 0) {
						return i;
					}
				}
				return false;
			},
			getRecurState: function() {
				return $(this).find('select').val();
			},
			getRecurDates: function() {
				return this.multiDatesPicker.initialRecurDates;
			},
			getDates : function( format, type ) {
				if(!format) format = 'string';
				if(!type) type = 'picked';
				switch (format) {
					case 'object':
						return this.multiDatesPicker.dates[type];
					case 'string':
					case 'number':
						var o_dates = new Array();
						for(var i = 0; i < this.multiDatesPicker.dates[type].length; i++)
							o_dates.push(
								dateConvert.call(
									this, 
									this.multiDatesPicker.dates[type][i], 
									format
								)
							);
						return o_dates;
					
					default: $.error('Format "'+format+'" not supported!');
				}
			},
			addDates : function( dates, type ) {
				if(dates.length > 0) {
					if(!type) type = 'picked';
					switch(typeof dates) {
						case 'object':
						case 'array':
							if(dates.length) {
								for(var i = 0; i < dates.length; i++)
									addDate.call(this, dates[i], type, true);
								sortDates.call(this, type);
								break;
							} // else does the same as 'string'
						case 'string':
						case 'number':
							addDate.call(this, dates, type);
							break;
						default: 
							$.error('Date format "'+ typeof dates +'" not allowed on jQuery.multiDatesPicker');
					}
					$(this).datepicker('refresh');
				} else {
					$.error('Empty array of dates received.');
				}
			},
			removeDates : function( dates, type ) {
				if(!type) type = 'picked';
				var removed = [];
				if (Object.prototype.toString.call(dates) === '[object Array]') {
					for(var i in dates.sort(function(a,b){return b-a})) {
						removed.push(removeDate.call(this, dates[i], type));
					}
				} else {
					removed.push(removeDate.call(this, dates, type));
				}
				$(this).datepicker('refresh');
				return removed;
			},
			removeIndexes : function( indexes, type ) {
				if(!type) type = 'picked';
				var removed = [];
				if (Object.prototype.toString.call(indexes) === '[object Array]') {
					for(var i in indexes.sort(function(a,b){return b-a})) {
						removed.push(removeIndex.call(this, indexes[i], type));
					}
				} else {
					removed.push(removeIndex.call(this, indexes, type));
				}
				$(this).datepicker('refresh');
				return removed;
			},
			resetDates : function ( type ) {
				if(!type) type = 'picked';
				this.multiDatesPicker.dates[type] = [];
				$(this).datepicker('refresh');
			},
			toggleDate : function( date, type ) {
				if(!type) type = 'picked';
				
				switch(this.multiDatesPicker.mode) {
					case 'daysRange':
						this.multiDatesPicker.dates[type] = []; // deletes all picked/disabled dates
						var end = this.multiDatesPicker.autoselectRange[1];
						var begin = this.multiDatesPicker.autoselectRange[0];
						if(end < begin) { // switch
							end = this.multiDatesPicker.autoselectRange[0];
							begin = this.multiDatesPicker.autoselectRange[1];
						}
						for(var i = begin; i < end; i++)
							methods.addDates.call(this, methods.sumDays(date, i), type);
						break;
					case 'rangeSelection':
						this.multiDatesPicker.dates['picked'] = [];
						var startRangeSelection = this.multiDatesPicker.startRangeSelection;
						if (!startRangeSelection) {
							methods.addDates.call(this, date, type);
						} else if (date !== startRangeSelection) {
							var dates = methods.getDatesBetween(startRangeSelection, date, this.multiDatesPicker.dates['disabled']);
							methods.addDates.call(this, dates, 'picked')
						}
						break;
					default:
						if(methods.gotDate.call(this, date) === false) // adds dates
							methods.addDates.call(this, date, type);
						else // removes dates
							methods.removeDates.call(this, date, type);
						break;
				}
			}, 
			setMode : function( options ) {
				var $this = $(this);
				if(options.mode) this.multiDatesPicker.mode = options.mode;
				
				switch(this.multiDatesPicker.mode) {
					case 'normal':
						for(option in options)
							switch(option) {
								case 'maxPicks':
								case 'minPicks':
								case 'pickableRange':
								case 'adjustRangeToDisabled':
								case 'enableRecurring':
									this.multiDatesPicker[option] = options[option];
									break;
							}
						break;
					case 'daysRange':
					case 'weeksRange':
						var mandatory = 1;
						for(option in options)
							switch(option) {
								case 'autoselectRange':
									mandatory--;
								case 'adjustRangeToDisabled':
									this.multiDatesPicker[option] = options[option];
									break;
							}
						if(mandatory > 0) $.error('Some mandatory options not specified!');
						break;
					case 'rangeSelection':
						for(option in options)
							switch(option) {
								case 'pickableRange':
								case 'adjustRangeToDisabled':
								case 'enableRecurring':
								case 'showRangeOnHover':
									this.multiDatesPicker[option] = options[option];
									break;
							}
						break;
				}
				
				if(mdp_events.onSelect)
					mdp_events.onSelect();
				$this.datepicker('refresh');
			}
		};
		
		this.each(function() {
			if (!this.multiDatesPicker) {
				this.multiDatesPicker = {
					dates: {
						picked: [],
						disabled: []
					},
					mode: 'normal',
					adjustRangeToDisabled: true
				};
			}
			
			if(methods[method]) {
				var exec_result = methods[method].apply(this, Array.prototype.slice.call(mdp_arguments, 1));
				switch(method) {
					case 'getDates':
					case 'removeDates':
					case 'gotDate':
					case 'sumDays':
					case 'compareDates':
					case 'dateConvert':
					case 'getRecurDates':
					case 'getRecurState':
					case 'getRangeDisabledConflict':
						ret = exec_result;
				}
				return exec_result;
			} else if( typeof method === 'object' || ! method ) {
				return methods.init.apply(this, mdp_arguments);
			} else {
				$.error('Method ' +  method + ' does not exist on jQuery.multiDatesPicker');
			}
			return false;
		});

		return ret;
	};

	var PROP_NAME = 'multiDatesPicker';
	var dpuuid = new Date().getTime();
	var instActive;

	$.multiDatesPicker = {version: false};
	$.multiDatesPicker.initialized = false;
	$.multiDatesPicker.uuid = new Date().getTime();
	$.multiDatesPicker.version = $.ui.multiDatesPicker.version;

	// Workaround for #4055
	// Add another global to avoid noConflict issues with inline event handlers
	window['DP_jQuery_' + dpuuid] = $;
})( jQuery );
