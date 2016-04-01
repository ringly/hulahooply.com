
/*globals jQuery: false, $: false, window: false, Stripe: false */

(function($, angular, synthify, undefined) {

    var Ringly = window.Ringly = window.Ringly || {}, // global variable for namespacing
        _notProd = Ringly._notProd,
        _devLog = Ringly._devLog,
        $window = $(window),
        $html = $('html'),
        $body = $('body'); // also in style.less


    // Resize event
    // ------------
    //
    // A debounced resize event to avoid over-doing event listeners
    //
    (function() {
        var resized = false;

        $window.on('resize load orientationchange', function() {
            resized = true;
        });
        $('img').on('load', function() {
            resized = true;
        });

        window.setInterval(function() {
            if (resized) {
                resized = false;
                $window.trigger('safe-resize');
            }
        }, 200);
    })();


    // Notifications
    // -------------
    //
    // Animate between each notification "ringly only notifies you about the..."
    //
    (function() {
        var animateDelay = 2500,
            fadeOutDelay = 600,
            fadeInDelay = 250,
            $slides = $('#notifies-notification li'),
            $lastSlide = $slides.first(),
            index = 0;

        function animateNext() {
            index = (index + 1 >= $slides.size() ? 0 : index + 1);
            var $slide = $($slides.get(index));
            $lastSlide.fadeOut(fadeOutDelay, function() {
                $slide.fadeIn(fadeInDelay, function() {
                    $lastSlide = $slide;
                    window.setTimeout(animateNext, animateDelay);
                });
            });
        }

        window.setTimeout(animateNext, animateDelay);
    })();


    // Defer video load
    // ----------------
    //
    // Grab data-* attrs and turn those into attrs of an iframe
    //
    $(function() {
        var scrollCheckers = [];

        $('.video-placeholder').each(function() {
            var $vp = $(this);
            var data = $vp.data();

            var top = $vp.offset().top;

            scrollCheckers.push({
                computeTop: function() {
                    return $vp.offset().top - 1500;
                },
                load: function() {
                    var h = data.height;
                    var w = data.width;
                    delete data.height;
                    delete data.width;
                    var $iframe = $('<iframe>', data);
                    if (h) { $iframe.attr('height', h); }
                    if (w) { $iframe.attr('width', w); }
                    $iframe.insertAfter($vp).hide().fadeIn(2000);
                    $vp.remove();
                }
            });
        });

        $window
            .on('safe-resize.video-placeholder', function() {
                if (!scrollCheckers.length) {
                    $window.off('safe-resize.video-placeholder');
                    return;
                }
                $.each(scrollCheckers, function() {
                    this.top = this.computeTop();
                });
            })
            .on('scroll.video-placeholder', function() {
                var scrollTop = $window.scrollTop();
                scrollCheckers = $.map(scrollCheckers, function(checker) {
                    if (scrollTop > checker.top) {
                        checker.load();
                        return null;
                    }
                    return checker;
                });
                if (!scrollCheckers.length) {
                    $window.off('scroll.video-placeholder');
                }
            })
            .trigger('safe-resize.video-placeholder')
            .trigger('scroll.video-placeholder');
    });


    // Onload fades
    // ------------
    //
    // Dirt simple way to fade something in onload, e.g., the header
    // text had some weird font-loading + CSS transition things, so
    // we can just hide it until window.load. Has a slight hack to
    // make sure we don't show something that should be hidden otherwise.
    //
    $(function() {
        $('.onload-fadein').each(function() {
            var $this = $(this);
            $this.removeClass('onload-fadein');

            // only fadein if it will be visible
            if ($this.filter(':visible').size()) {
                $this.hide().fadeIn('normal', function() {
                    // remove fadein override, once we're visible again
                    $this.attr('style', '');
                });
            }
        });
    });


    // Ring clicking
    // -------------
    //
    (function() {

        // wait for document ready so angular has the scope
        $(function() {
            $('body').on('click', 'a.ringly-item', function(e) {
                var $this = $(this),
                    id = $this.data('id');
                if ($this.hasClass('view-only')) {
                    return;
                }
                e.preventDefault();
                $window.trigger('checkoutOpen', [{product_id: id}]);
            });
        });
    })();


    // Touch/Android/iOS check boostrap modal fix
    // ------------------------------------------
    //
    // ...ugly but necessary via
    // http://www.abeautifulsite.net/blog/2013/11/bootstrap-3-modals-and-the-ios-virtual-keyboard/
    //
    // TODO - could consider making position absolute only when inside input,textarea
    // so scroll is contained when keyboard isn't open? However, this doesn't fix the
    // problem with Android doing weird stuff during normal scroll.
    //
    if ($html.hasClass('touch')) {

        Ringly.simpleModal = true;

        $('.modal').on('show.bs.modal', function() {

            // (PETER) Extra change - maybe not necessary in iOS
            // but breaks desktop scroll without it
            $('body').css('overflow', 'visible');

            // Position modal absolute and bump it down to the scrollPosition
            $(this)
                .css({
                    position: 'absolute',
                    marginTop: $window.scrollTop() + 'px',
                    bottom: 'auto'
                });

            // Position backdrop absolute and make it span the entire page
            //
            // Also dirty, but we need to tap into the backdrop after Boostrap
            // positions it but before transitions finish.
            //
            window.setTimeout( function() {
                var $backdrop = $('.modal-backdrop').css({
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: Math.max(
                        document.body.scrollHeight, document.documentElement.scrollHeight,
                        document.body.offsetHeight, document.documentElement.offsetHeight,
                        document.body.clientHeight, document.documentElement.clientHeight
                    ) + 'px'
                });

                // since backdrop is so tall now, we want to make it trigger close too
                if (!$backdrop.data('click-handler')) {
                    $backdrop
                        .data('click-handler', true)
                        .click(function() {
                            $('.modal').modal('hide');
                        });
                }
            }, 0);
        });
    }


    // Query string
    // ------------
    //
    // The URL's query string data, call `first(key)` to grab
    // a single value (or undefined) or `get(key)` to retrieve
    // a list of all values (or undefined).
    //
    var QueryString = (function() {
        var data = {},
            qs = window.location.href.split('?')[1] || '',
            params = qs.split('&'),
            i = 0,
            len = params.length,
            param, key, value;
        for (; i<len; i++) {
            param = params[i].split('=');
            key = decodeURIComponent(param[0]);
            value = decodeURIComponent(param.slice(1).join('='));
            if (!data[key]) {
                data[key] = [];
            }
            data[key].push(value);
        }

        return {
            first: function(key) {
                return data[key] ? data[key][0] : undefined;
            },
            get: function(key) {
                return data[key];
            }
        };
    })();


    // Referral client code
    // --------------------
    //
    (function() {
        var expiresDefault = 2*24*60*60*1000; // 2 days (chosen arbitrarily)

        var configs = [
            {key: 'autoCode', store: 'refAutoCode'},
            {key: 'promoCode', store: 'refPromoCode'},
            {key: 'appShareCode', qs: 's'},
            {key: 'referralCode', qs: 'r'}
        ];

        var result = {
            _updateCode: function updateCode(key, value) {
                var config = Ringly.Fnl.first(configs, function(config) {
                    return config.key === key;
                });
                if (!config) {
                    Ringly.error('Bad referral key', key);
                    return;
                }
                result[config.key] = value;
                _storeOrGet(config.store, value);
                _clean();
            }
        };

        $.each(configs, function(i, config) {
            config.store = config.store || config.key;
            var val = (config.qs && QueryString.first(config.qs)) || _storeOrGet(config.store) || '';
            if (val) {
                _storeOrGet(config.store, val);
            }
            result[config.key] = val;
        });

        // HACK - support the skimm promo page
        if (window.location.pathname === '/theskimm') {
            result.promoCode = 'THESKIMM10';
        }

        //
        // helpers
        //

        function _storeOrGet(key, val) {
            return val ? synthify.store(key, val, {expires: expiresDefault}) : synthify.store(key);
        }

        function _clean() {
            var foundKey = false;
            $.each(configs, function(i, config) {
                if (foundKey || !result[config.key]) {
                    result[config.key] = '';
                } else {
                    foundKey = true;
                }
            });
        }

        _clean();

        Ringly.Referral = result;
    })();


    // JSON backup
    // -----------
    //
    // This is for <= IE7, <= FF 3.4, etc. - so basically no one.
    //
    if (!window.JSON) {
        $('<script>', {
            src: '//cdnjs.cloudflare.com/ajax/libs/json2/20130526/json2.min.js'
        }).appendTo('head');
    }


    // Placeholder backup
    // ------------------
    //
    // This is mostly for <= IE9 and some other browsers that don't support
    // placeholders
    //
    $(function() {
        var url = $('#placeholder-url').data('url');
        if (url && window.Modernizr && !window.Modernizr.input.placeholder) {
            $('<script>', {
                src: url
            }).appendTo('head');
        }
    });


    // Optimizely Tracking
    // ---------------------
    //
    // Custom events for Optimizely AB testing
    //
    (function() {
        function trackOptimizely(row) {
            window.optimizely = window.optimizely || [];
            window.optimizely.push(row);
        }

        $window
            .on('checkoutSuccess', function(e, data) {
                trackOptimizely(['trackEvent', 'checkoutSuccess', {revenue: data.amount}]);
            })
            .on('checkoutOpen', function(e, data) {
                trackOptimizely(['trackEvent', 'checkoutOpen']);
            })
            .on('checkoutStepChange', function(e, step) {
                if (step >= 2) {
                    trackOptimizely(['trackEvent', 'checkoutPage' + step]);
                }
            });
    })();


    // Friendbuy Tracking
    // ------------------
    //
    (function() {
        var friendbuy_id = 'site-c65ddca7-www.ringly.com';
        window.friendbuy = window.friendbuy || [];

        $window
            .on('checkoutSuccess', function(e, data) {
                if (typeof(data.is_new_customer) !== 'boolean') {
                    Ringly.error('window.CheckoutSuccess: missing is_new_customer!', data);
                }
                if (!data.email) {
                    Ringly.error('window.CheckoutSuccess: missing email!', data);
                }

                var trackData = ['track', 'order', {
                    id: data.coupon_code,
                    amount: Ringly.cents2Dollars(data.amount),
                    new_customer: data.is_new_customer,
                    email: data.email
                }];
                _devLog('friendbuy', trackData);
                window.friendbuy.push(trackData);

                var products = $.map(Ringly.GetProductShoppingCartItems(), function(item) {
                    return {
                        sku: item.sku_code,
                        price: Ringly.cents2Dollars(item.actual_price),
                        quantity: 1
                    };
                });
                trackData = ['track', 'products', products];
                _devLog('friendbuy', trackData);
                window.friendbuy.push(trackData);
            });
    })();


    // Google analytics tracking
    // -------------------------
    //
    // Track important events in google analytics, so we can look
    // at trends. Uses the "enhanced ecommerce" features.
    //
    // https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce#checkout-process
    //
    // TODO(GA):
    //
    // *   Measuring a Product Details View - maybe pass through to html-snippet?
    // *   Measuring a Product Click - ?
    //
    (function() {
        var checkoutCat = 'checkout';
        var newsletterCat = 'newsletter-signup';

        function ga(a, b, c, d, e, f) {
            if (window.ga) {
                // for dev/staging log to console
                if (_notProd()) {
                    var args = $.makeArray(arguments);
                    args.unshift('ga');
                    _devLog.apply(_devLog, args);
                }

                // staging/dev point to a different GA
                window.ga(a, b, c, d, e, f);
            } else {
                Ringly.log('Google analytics not set up!');
            }
        }

        function trackEvent(category, action, label, value) {
            ga('send', 'event', category, action, label, value);
        }

        function createProduct(prodId, sku_code, overrides) {
            var list = $body.data('page');
            var ga_product = {
                list: list,
                brand: 'Ringly'
            };

            var rly_product = (sku_code ?
                               Ringly.Inventory.getProductFromSkuCode(sku_code) :
                               Ringly.Inventory.getProductById(prodId));

            if (rly_product) {
                ga_product = $.extend(ga_product, {
                    id: rly_product.id, // TODO(SKUS)(GASKU) - change GA to record by SKU instead of product_id
                    name: rly_product.display_name,
                    // TODO(SKUS)(CATS) - return category with product json? especially when bracelets
                    category: (rly_product.is_giftcard ? Ringly.GIFTCARD_CATEGORY :
                               rly_product.is_ring ? 'Rings' : 'Other'),
                    price: Ringly.cents2Dollars(rly_product.price)
                });

                // HACK - treat sku as variant, since we use product id as `id`
                if (rly_product.sku_code) {
                    ga_product.vairant = rly_product.sku_code;
                }
            } else {
                return null;
            }

            return $.extend(ga_product, overrides);
        }

        function ecAddCartProducts() {
            // group by id and figure out quantities
            var idToItems = {};
            var items = Ringly.GetProductShoppingCartItems();
            $.each(items, function(_, item) {
                item = $.extend({}, item);
                item.quantity = item.quantity || 1;
                // TODO(SKUS)(GASKU) - change analytics to go by sku instead of product id
                if (!idToItems[item.product.id]) {
                    idToItems[item.product.id] = [];
                }
                for (var j = 0; j < item.quantity; j++) {
                    idToItems[item.product.id].push(item);
                }
            });

            // add products
            var counter = 1;
            $.each(idToItems, function(id, items) {
                var item = items[0];
                // TODO(SKUS)(GASKU) - only work with sku and not product id? or impossible?
                ga('ec:addProduct', createProduct(item.product.id, null, {
                    quantity: items.length,
                    position: counter
                }));
                counter++;
            });
        }

        var wasSuccess = false;
        var errorsPerPageCount = 0;

        $window
            .on('gaTrackImpressions', function() {
                $('.ringly-item').each(function(i) {
                    var $this = $(this);
                    ga('ec:addImpression', createProduct($this.data('id'), null, {
                        position: i + 1
                    }));
                });
            })
            .on('checkoutAdd', function(e, data) {
                var product_id = data.product_id;
                var sku_code = data.sku_code;
                // TODO(SKUS)(GASKU) - get the sku on checkout add if available?
                ga('ec:addProduct', createProduct(product_id, sku_code, {
                    // TODO(addrcheckout) - include sku too!? - and size vs quantity?
                    quantity: data.quantity || 1
                }));
                ga('ec:setAction', 'add');
                trackEvent(checkoutCat, 'add-to-cart', {nonInteraction: 1});
            })
            .on('checkoutRemove', function(e, data) {
                var sku_code = data.sku_code;
                var product_id = data.product_id;
                ga('ec:addProduct', createProduct(product_id, sku_code, {
                    quantity: 1
                }));
                ga('ec:setAction', 'remove');
                trackEvent(checkoutCat, 'remove-from-cart', {nonInteraction: 1});
            })
            .on('checkoutOpened', function(e, data) {
                // track what's in the cart
                ecAddCartProducts();
                ga('ec:setAction', 'checkout', {
                    step: 1
                });
                trackEvent(checkoutCat, 'open');
            })
            .on('checkoutStepChange', function(e, step) {
                ecAddCartProducts();
                ga('ec:setAction', 'checkout', {
                    step: step
                });
                trackEvent(checkoutCat, 'checkout-step');
            })
            .on('checkoutClose', function(e) {
                if (!wasSuccess) {
                    trackEvent(checkoutCat, 'close');
                }
                wasSuccess = false;
            })
            .on('checkoutSuccess', function(e, data) {
                wasSuccess = true;
                ecAddCartProducts();
                ga('ec:setAction', 'purchase', {
                    id: data.confirmation_code,
                    affiliation: 'Ringly Store - Online',
                    revenue: Ringly.cents2Dollars(data.amount),
                    tax: Ringly.cents2Dollars(data.taxes),
                    shipping: Ringly.cents2Dollars(data.shipping),
                    coupon: data.coupon_code || ''
                });
                trackEvent(checkoutCat, 'success', 'amount', data.amount);
            })
            .on('checkoutError', function(e, data) {
                errorsPerPageCount++;
                var label = data && data.label || undefined;
                var value = label ? errorsPerPageCount : undefined;
                trackEvent(checkoutCat, 'error', label, value);
            })
            .on('trackCoupon', function(e, data) {
                var action = data.action;
                action = 'coupon-' + data.action;
                trackEvent(checkoutCat, action, data.label, data.value);
            })
            .on('newsletterSuccess', function(e, data) {
                trackEvent(newsletterCat, 'registered', data && data.via);
            })
            .on('sweepstakesSuccess', function(e, data) {
                trackEvent(newsletterCat, 'sweepstakes', data && data.via);
            });


        // TODO(addrcheckout) - no longer listen to #payment-modal
        $('#payment-modal').on('hide.bs.modal', function(e) {
            // don't trigger "close" if order was a success
            if (!wasSuccess) {
                trackEvent(checkoutCat, 'close');
            }
            wasSuccess = false;
        });

    })();


    // Ad retargeting/remarketing
    // --------------------------
    //
    (function() {
        // only run tracking if environment is correct
        var should_track;
        if (!window.Config || !window.Config.ENV) {
            Ringly.error('No config or no Config.ENV');
            should_track = true;
        } else {
            should_track = (window.Config.ENV === 'prod');
        }

        var adwords_url = '//www.googleadservices.com/pagead/conversion_async.js';
        var kenshoo_url = '//5212.xg4ken.com/media/getpx.php?cid=1cc94141-ef5c-4475-8a71-ad3ce4143d49';

        function _prodTrackGeneric(service, msg, fn) {
            _devLog(service, msg);
            if (should_track) {
                if ($.isFunction(fn)) {
                    fn();
                } else {
                    Ringly.error('Missing _prodTrackGeneric fn', service, msg, fn);
                }
            }
        }

        function _prodTrackGoogle(data) {
            _devLog('google_trackConversion', data);
            if (should_track) {
                $.getScriptCacheTrue(adwords_url, function() {
                    window.google_trackConversion(data);
                });
            }
        }

        function _prodTrackFB(action, label, data) {
            _devLog('fbq', action, label, data);
            if (should_track) {
                var fbq = window.fbq;
                if (fbq) {
                    fbq(action, label, data);
                } else {
                    Ringly.error('No window.fbq!');
                }
            }
        }

        function _prodTrackKenshoo(data, data2) {
            _devLog('k_trackevent', data, data2);
            if (should_track) {
                $.getScriptCacheTrue(kenshoo_url, function() {
                    window.k_trackevent(data, data2);
                });
            }
        }

        function getTagParams(ga_page_type, product_id, sku_code, starting_value_dollars) {
            var sku_codes = [];
            var name = '';
            var category = '';
            var pagetype = ga_page_type || $body.data('page');
            var value = 0; // dollars (not cents!)
            var currency = 'USD';

            if (product_id) {
                var product = Ringly.Inventory.getProductById(product_id);
                if (product) {
                    if (!sku_code) {
                        sku_code = Ringly.Inventory.forceSkuCodeFromProductId(product_id);
                    }
                    sku_codes.push(sku_code);
                    name = product.display_name;
                    category = product.is_giftcard ? Ringly.GIFTCARD_CATEGORY : 'Rings';
                    value = Ringly.cents2Dollars(product.price);
                }
            } else {
                sku_codes = [];
                $.each(Ringly.GetProductShoppingCartItems(), function(_, item) {
                    var sku_code = item.sku_code || Ringly.Inventory.forceSkuCodeFromProductId(item.product_id);
                    sku_codes.push(sku_code);
                    value = value + Ringly.cents2Dollars(item.actual_price || 0);
                });
            }

            value = starting_value_dollars || value;

            return {
                // https://developers.google.com/adwords-remarketing-tag/parameters?hl=en#retail
                google: {
                    ecomm_prodid: sku_codes,
                    ecomm_pagetype: pagetype,
                    ecomm_totalvalue: value
                },
                // https://developers.facebook.com/docs/ads-for-websites/tag-api
                fb: {
                    content_name: name,
                    content_category: category,
                    content_ids: sku_codes,
                    content_type: 'product', // different meaning from adwords ecomm_pagetype
                    value: value,
                    currency: currency
                }
            };
        }

        // init page defaults
        var base_tag_params = getTagParams(null, $body.data('product_id'));
        window.google_tag_params = base_tag_params.google;
        if ($body.data('page') === 'cart') {
            window.google_skip_load = true;
        }

        // event handlers
        $window
            // .on('viewProduct', function(e, data) {
            //     var product_id = data.product_id;
            //     var sku_code = data.sku_code || Ringly.Inventory.forceSkuCodeFromProductId(product_id);
            //     var tag_params = getTagParams(null, product_id, sku_code);

            //     // adwords view product tracking
            //     _prodTrackGoogle({
            //         google_conversion_id: 964298163,
            //         google_custom_params: tag_params.google,
            //         google_remarketing_only: true
            //     });

            //     // facebook view product tracking - what's diff between this and page load?
            //     _prodTrackFB('track', 'ViewContent', tag_params.fb);
            // })
            .on('checkoutAdd', function(e, data) {
                var product_id = data.product_id;
                var sku_code = data.sku_code || Ringly.Inventory.forceSkuCodeFromProductId(product_id);
                var tag_params = getTagParams(null, product_id, sku_code);

                // adwords add to cart tracking
                _prodTrackGoogle({
                    google_conversion_id: 964298163,
                    google_conversion_label: 'HGtqCP6rjGIQs4voywM',
                    google_custom_params: tag_params.google,
                    google_remarketing_only: true
                });

                // facebook add to cart tracking
                _prodTrackFB('track', 'AddToCart', tag_params.fb);
            })
            .on('checkoutOpened', function(e, data) {
                var tag_params = getTagParams('cart');

                // adwords started checkout tracking
                _prodTrackGoogle({
                    google_conversion_id: 964298163,
                    google_conversion_label: '0lLVCIqGllcQs4voywM',
                    google_custom_params: tag_params.google,
                    google_remarketing_only: true
                });

                // facebook started checkout tracking
                _prodTrackFB('track', 'InitiateCheckout', tag_params.fb);
            })
            .on('checkoutSuccess', function(e, data) {
                var tag_params = getTagParams('purchase', null, null, Ringly.cents2Dollars(data.amount));
                var amount_dollars = Ringly.cents2Dollars(data.amount);

                // adwords completed checkout
                _prodTrackGoogle({
                    google_conversion_id: 964298163,
                    google_conversion_language: 'en',
                    google_conversion_format: '2',
                    google_conversion_color: 'ffffff',
                    google_conversion_label: 'Y0VXCN2RhwoQs4voywM',
                    google_conversion_value: amount_dollars,
                    google_conversion_currency: 'USD',
                    google_custom_params: tag_params.google,
                    google_remarketing_only: false
                });

                // facebook completed checkout
                _prodTrackFB('track', 'Purchase', tag_params.fb);

                // pinterest completed checkout
                var pinterest_url = 'https://ct.pinterest.com/?tid=ng8WyysAmVd';
                _prodTrackGeneric('pinterest', pinterest_url, function() {
                    $('<img>', {
                        height: 1, width: 1, alt: '',
                        src: pinterest_url,
                        css: {
                            position: 'absolute',
                            left: '-400px',
                            top: '0' // bottom zero pushed page down
                        }
                    }).appendTo('body');
                });

                // kenshoo completed checkout
                _prodTrackKenshoo([
                    'id=1cc94141-ef5c-4475-8a71-ad3ce4143d49',
                    'type=purchase',
                    'val=' + amount_dollars,
                    'orderId=' + data.confirmation_code,
                    'promoCode=' + (data.coupon_code || ''),
                    'valueCurrency=USD',
                    'GCID=', // For Live Tracking only
                    'kw=', // For Live Tracking only
                    'product=' // For Live Tracking only
                ], '5212');
            })
            .on('newsletterSuccess', function(e, data) {
                // facebook email registered
                _prodTrackFB('track', 'CompleteRegistration', {});

                // kenshoo email registered
                _prodTrackKenshoo([
                    'id=1cc94141-ef5c-4475-8a71-ad3ce4143d49',
                    'type=email',
                    'val=0.0',
                    'orderId=',
                    'promoCode=',
                    'valueCurrency=USD',
                    'GCID=', // For Live Tracking only
                    'kw=', // For Live Tracking only
                    'product=' // For Live Tracking only
                ], '5212');
            });
    })();


    // User Photos - touch events
    // --------------------------
    //
    // Enables old snapchat-like functionality in mobile, so touching
    // the image shows the hover state until touchend
    //
    (function() {
        $('.user-photo').on('touchstart touchend', function(e) {
            $(this).toggleClass('selected', e.type === 'touchstart');
        });
    })();


    // Footer newsletter
    // -----------------
    //
    (function() {
        $('.newsletter-signup').submit(function(evt) {
            evt.preventDefault();
            var $this = $(this),
                $button = $this.find('button[type=submit]'),
                $infoMain = $('.newsletter-info-main'),
                $infoMsg = $('.newsletter-info-msg'),
                url = $this.attr('action'),
                email = $.trim($('#id_email_signup').val());

            if (!email || $this.data('submitting')) {
                return;
            }
            $this.data('submitting', true);

            $infoMain.hide();
            $infoMsg.text('loading...');
            $button.addClass('loading');

            $.ajax({
                url: url,
                type: 'post',
                dataType: 'json',
                data: {
                    email: email
                }
            }).done(function(data, textStatus) {
                if (data.error_message) {
                    $infoMsg.text(data.error_message);
                } else {
                    $infoMain.show();
                    $infoMsg.empty();
                    $this.empty().append($('<div>', {
                        'class': 'newsletter-result',
                        text: 'Thanks, you’re in!'
                    }));
                    $window.trigger('newsletterSuccess', [{via: 'footer'}]);
                }
            }).fail(function(jqXHR, textStatus, errorStr) {
                $infoMsg.text('Oh no, there was an error! Please try again:');
            }).always(function() {
                $this.data('submitting', false);
                $button.removeClass('loading');
            });
        });
    })();


    // Newsletter Interstitial
    // -----------------------
    //
    (function() {
        var dismissedKey = 'nwslttrDsms';
        var codeKey = 'nwslttrCpn';
        var codeExpires = 3*60*60*1000; // save code for 3 hours (chosen arbitrarily)

        var context = {
            coupon_code: synthify.store(codeKey)
        };

        // expose ability to clear newsletter dismiss & code state
        window._clearNwslttr = function() {
            $.map([dismissedKey, codeKey], function(key) {
                synthify.store(key, null);
            });
        };

        $('.newsletter-modal').slideUpModal({ // TODO - custom class
            autoShow: function() {
                return !context.coupon_code;
            },
            autoShowForce: function() {
                return /#?newsletter/.test(window.location.hash.toLowerCase());
            },
            autoShowDisplayDelay: 2*1000,
            autoShowDismissedKey: dismissedKey,
            onBeforeUpdate: function() {
                var $modal = this.$modal;
                var sectionName = context.coupon_code ? 'view-success' : 'view-form';
                var $sec = $modal.find('.' + sectionName);

                // auto-populate any defined variables with our context data
                $sec.find('.variable').each(function() {
                    var $elt = $(this),
                        name = $elt.data('name');
                    if (name) {
                        $elt.text(context[name]);
                    }
                });

                $modal.find('.view-section').hide().each(function() {
                    var $this = $(this),
                        parentClass = $this.data('parent_class');
                    if (parentClass) {
                        $modal.removeClass(parentClass);
                    }
                });

                $modal.addClass($sec.data('parent_class'));
                $sec.show();
            },
            onFormSubmit: function(e, modal) {
                e.preventDefault();
                var $modal = this.$modal,
                    $form = this.$form,
                    url = $form.attr('action'),
                    email = $.trim($('#id_nm_email_signup').val()),
                    formData = $form.serializeArray(),
                    $errorMsg = $form.find('.error-message'),
                    $button = $form.find('[type=submit]');

                if (!email || $form.data('submitting')) {
                    return;
                }
                $form.data('submitting', true);
                $button.addClass('loading');
                $errorMsg.empty();

                $('input:focus').blur(); // clear iOS keyboard?

                $.ajax({
                    url: url,
                    type: 'post',
                    dataType: 'json',
                    data: formData
                }).done(function(data, textStatus) {
                    if (data.error_message) {
                        $errorMsg.text(data.error_message);
                    } else {
                        $.extend(context, data);
                        synthify.store(codeKey, data.coupon_code, {expires: codeExpires});
                        $modal.slideUpModal('update'); // trigger an update
                        $window.trigger('newsletterSuccess', [{via: 'interstitial'}]);

                        if (data.auto_apply) {
                            Ringly.Referral._updateCode('autoCode', data.coupon_code);
                        }
                    }
                    $modal.slideUpModal('dismissForFuture'); // prevent showing up again
                }).fail(function(jqXHR, textStatus, errorStr) {
                    $errorMsg.text('Oh no, there was an error! Please referesh and try again.');
                }).always(function() {
                    $form.data('submitting', false);
                    $button.removeClass('loading');
                });
            }
        });
    })();

    // $('body').addClass('test-narrow-checkout').addClass('test-mobile-bag');

})(jQuery, angular, synthify);
