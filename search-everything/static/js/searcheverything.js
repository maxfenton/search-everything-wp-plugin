var SearchEverything = (function ($) {
	var r = {
			months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
			resizeSearchInput: function () {
				var input = $('#se-metabox-text');

				input.css({
					'width': input.closest('div').outerWidth(true) - input.next('a').outerWidth(true)
				});
			},
			handleWindowResize: function () {
				$(window).resize(r.resizeSearchInput);
			},
			handleMetaboxActions: function () {
				$('.meta-box-sortables').on('sortstop', function (event, ui) {
					if (ui.item && ui.item.length && ui.item[0].id === 'se-metabox') {
						r.resizeSearchInput();
					}
				});
				$('.postbox h3, .postbox .handlediv').on('click', function (ev) {
					var postbox = $(this).closest('.postbox');

					setTimeout(function () {
						if (!postbox.hasClass('closed')) {
							r.resizeSearchInput();
						}
					}, 1); // Delay till WP finishes its own thing and then we can kick in
				})
			},
			displayOwnResults: function (holder, data) {
				var count = 0;

				$.each(data, function (i, result) {
					var listItem = $('<li><a title="Click to insert link into post."><h6></h6><span></span><p></p></a></li>');
					if (i > 4) {
						return;
					}
					count += 1;

					listItem.find('h6').text(result.post_title || 'Title missing');
					listItem.find('p').text($('<div>' + result.post_content.replace(/\[.*?\]\s?/g, '') + '</div>').text().substring(0, 150) || 'No excerpt');
					listItem.find('span').text(r.urlDomain(result.guid));
					listItem.data(result);

					holder.append(listItem);
				});

				return count;
			},
			displayExternalResults: function (holder, data) {
				var count = 0;

				$.each(data, function (i, result) {
					var listItem = $('<li><a title="Click to insert link into post."><h6></h6><span></span><p></p></a></li>');
					if (i > 4) {
						return;
					}
					count += 1;

					listItem.find('h6').text(result.title || 'Title missing');
					listItem.find('p').text($('<div>' + result.text_preview + '</div>').text().substring(0, 150) || 'No excerpt');
					listItem.find('span').text(r.urlDomain(result.url));
					listItem.data(result);

					holder.append(listItem);
				});

				return count;
			},
			performSearch: function () {
				var input = $('#se-metabox-text'),
					results = $('<div id="se-metabox-results"><div id="se-metabox-external-results" class="se-metabox-results-list se-hidden"><h4>Results from around the web</h4><p class="se-instructions">Click to insert link into post.</p><ul></ul></div><div id="se-metabox-own-results" class="se-metabox-results-list"><h4>Results from your blog</h4><p class="se-instructions">Click to insert link into post.</p><ul></ul></div><div class="se-spinner"></div></div>'),
					count = 0;

				$('#se-metabox-results').remove();
				input.closest('div').after(results);

				$.ajax({
					url: input.data('ajaxurl'),
					method: 'get',
					dataType: "json",
					data: {
						action: 'search_everything',
						text: tinyMCE && tinyMCE.activeEditor.getContent() || '',
						s: input.prop('value') || ''
					},
					success: function (data) {
						var ownResults = $('#se-metabox-own-results'),
							ownResultsList = ownResults.find('ul'),
							externalResults = $('#se-metabox-external-results'),
							externalResultsList = externalResults.find('ul');
						if (!window.externalSearchEnabled) {
							ownResults.before('<div id="se-metabox-own-powersearch" class="se-metabox-results-list"><h4>External Search</h4><p>If you want to use external search, you need to enable it in your <a href="options-general.php?page=extend_search"><strong>settings</strong></strong></a>.</p></div>');
							$('#se-metabox-own-powersearch').show();
						} else {
							if (data.external.length === 0) {
								$('#se-metabox-results').append('<p class="se-no-results">We haven\'t found any external resources for you.</p>');
							} else {
								externalResults.show();
								count =  r.displayExternalResults(externalResultsList, data.external);
								externalResults.find('h4').text(externalResults.find('h4').text() + ' (' + count + ')');
							}
						}

						$('.se-spinner, .se-no-results').remove();
						if (data.own.length === 0) {
							$('#se-metabox-results').append('<p class="se-no-results">It seems we haven\'t found any results for search term <strong>' + input.prop('value') + ' on your blog</strong>.</p>');
							externalResults.removeClass('se-hidden');
						} else {
							ownResults.show();
							count = r.displayOwnResults(ownResultsList, data.own);
							ownResults.find('h4').text(ownResults.find('h4').text() + ' (' + count + ')');
						}
					},
					error: function (xhr) {

					}
				});
			},
			urlDomain: function (url) { // http://stackoverflow.com/a/8498668
				var a = document.createElement('a');
				a.href = url;
				return a.hostname;
			},
			handleSearch: function () {
				var input = $('#se-metabox-text');
				input.on('keypress', function (ev) {
					if (13 === ev.which) {
						ev.preventDefault(); // Don't actually post... that would be silly
						if (!input.data('apiKey')) {
							r.performSearch();
						}
					}
				});

				$('#se-metabox-search').on('click', function (ev) {
					ev.preventDefault(); // Don't actually go to another page... that would be destructive
					if (!input.data('apiKey')) {
						r.performSearch();
					}
				});
			},
			initResultBehaviour: function () {
				var html = '<div id="se-just-a-wrapper">' +
							'<p>' +
								'<a target="_blank" class="se-box se-article">' +
									'<span class="se-box-heading">' +
										'<span class="se-box-heading-title"></span>' +
									'</span>' +
									'<span class="se-box-text"></span>' +
									'<span class="se-box-date"></span>' +
									'<span class="se-box-domain"></span>' +
								'</a>' +
							'</p>' +
						'</div>',
					metabox = $('#se-metabox');

				metabox.on('click', '#se-metabox-own-results li', function (ev) {
					var insertHtml = $(html),
						listItem = $(this),
						date = (function () {
							var datePart = listItem.data('post_date').split(' ')[0].split('-'),
								actualDate = new Date(datePart[0], datePart[1] - 1, datePart[2]);

							return r.months[actualDate.getMonth()] + ' ' + actualDate.getDate() + ' ' + actualDate.getFullYear();
						}()),
						inserted = $('a.se-box[href="' + listItem.data('guid') + '"]', tinyMCE && tinyMCE.activeEditor.contentWindow.document || document);

					if (inserted.length) {
						if (inserted.parent().prop("tagName") === 'P') {
							inserted.closest('p').remove();
						} else {
							inserted.remove();
						}
					} else {
						insertHtml.find('.se-box-heading-title').text(listItem.data('post_title') || 'Title missing'.substring(0, 50));
						insertHtml.find('.se-box-heading-domain').text('(' + r.urlDomain(listItem.data('guid')) + ')');
						insertHtml.find('.se-box-text').text($('<div>' + listItem.data('post_content').replace(/\[.*?\]\s?/g, '') + '</div>').text().substring(0, 100) || 'No excerpt');
						insertHtml.find('.se-box-date').text(date);
						insertHtml.find('.se-box-domain').text(r.urlDomain(listItem.data('guid')));
						insertHtml.find('.se-box').attr('href', listItem.data('guid'));

						if (send_to_editor) {
							send_to_editor(insertHtml.html());
						} else {
							// Dunno yet
						}
					}
				});
				metabox.on('click', '#se-metabox-external-results li', function (ev) {
					var insertHtml = $(html),
						listItem = $(this),
						date = (function () {
							var datePart = listItem.data('published_datetime').split('T')[0].split('-'),
								actualDate = new Date(datePart[0], parseInt(datePart[1], 10) - 1, parseInt(datePart[2], 10));

							return r.months[actualDate.getMonth()] + ' ' + actualDate.getDate() + ' ' + actualDate.getFullYear();
						}()),
						inserted = $('a.se-box[href="' + listItem.data('url') + '"]', tinyMCE && tinyMCE.activeEditor.contentWindow.document || document);

					if (inserted.length) {
						if (inserted.parent().prop("tagName") === 'P') {
							inserted.closest('p').remove();
						} else {
							inserted.remove();
						}
					} else {
						insertHtml.find('.se-box-heading-title').text(listItem.data('title') || 'Title missing'.substring(0, 50));
						insertHtml.find('.se-box-heading-domain').text('(' + r.urlDomain(listItem.data('article_id')) + ')');
						insertHtml.find('.se-box-text').text($('<div>' + listItem.data('text_preview') + '</div>').text().substring(0, 100) || 'No excerpt');
						insertHtml.find('.se-box-date').text(date);
						insertHtml.find('.se-box-domain').text(r.urlDomain(listItem.data('url')));
						insertHtml.find('.se-box').attr('href', listItem.data('url'));

						if (send_to_editor) {
							send_to_editor(insertHtml.html());
						} else {
							// Dunno yet
						}
					}
				});

				metabox.on('click', '.se-metabox-results-list h4', function () {
					$(this).closest('.se-metabox-results-list').toggleClass('se-hidden');
				});
			}
		},
		u = {
			initialize: function () {
				r.resizeSearchInput();
				r.handleWindowResize();
				r.handleMetaboxActions();
				r.handleSearch();
				r.initResultBehaviour();

				return this;
			}
		};
	return u;
}(jQuery));

jQuery(function () {
	SearchEverything.initialize();
});
