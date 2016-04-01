
(function($, skrollr, window, undefined) {
    var $window = $(window);
    var $html = $('html');


    var tools = {
        debounce: function debounce(fn, delay) {
            var timeout;
            var context;
            var args;

            delay = delay || 250;

            return function() {
                context = this;
                args = arguments;

                window.clearTimeout(timeout);
                window.setTimeout(function() {
                    fn.apply(context, args);
                    context = args = null;
                }, delay);
            };
        },
        Fnl: {
            first: function first(array, conditionFn) {
                for (var i = 0, len = array.length; i < len; i++) {
                    if (conditionFn(array[i])) {
                        return array[i];
                    }
                }
                return undefined;
            }
        }
    };


    // skrollr
    // -------
    //
    (function() {
        var skrollr_min_width = 992;
        var skrollr_min_height = 640;
        var enabled;
        var $html = $('html');

        function checkSkrollr() {
            if (window.innerWidth >= skrollr_min_width &&
                window.innerHeight >= skrollr_min_height &&
                !$html.hasClass('touch')) {
                if (enabled !== true) {
                    enabled = true;
                    skrollr.init({
                        skrollrBody: 'content'
                    });
                }
            } else {
                if (enabled !== false) {
                    if (enabled === undefined) {
                        $html.addClass('no-skrollr');
                    } else {
                        skrollr.init().destroy();
                    }
                    enabled = false;
                }
            }
        }

        checkSkrollr();

        var checker = tools.debounce(checkSkrollr);

        $window.on('resize orientationchange', checker);
    })();


    // click scrolling
    // ---------------
    //
    var $headers = $('header:first, .preorder-now');

    $('.slide-link').on('click', function(e) {
        e.preventDefault();
        var $this = $(this),
            href = $this.attr('href'),
            $ref = $('#push-' + href.substring(1));

        if (!$ref.filter(':visible').size()) {
            $ref = $(href);
        }

        // HACK - handle fixed position header
        var top = $ref.offset().top;
        if (!$html.hasClass('skrollr')) {
            var offsets = $headers.map(function() {
                var $elt = $(this);
                return ($elt.css('position') === 'fixed' ?
                        $elt.outerHeight() :
                        null);
            }).get();

            if (offsets.length) {
                top = top - offsets[0];
            }
        }

        $('html,body').animate({
            scrollTop: Math.ceil(top)
        }, 3000);
    });


    // watch video
    // -----------
    //
    (function() {
        var $overlay = $('.video-overlay').first();
        var iframe_domain = $overlay.data('domain');
        var $video;

        function _control(msg) {
            try {
                var cw = $overlay.find('iframe')[0].contentWindow;
                cw.postMessage(msg, iframe_domain);
            } catch(e) {
                try {
                    console.error('Unable to control iframe video', e);
                } catch(e2) {}
            }
        }

        function playVideo() {
            _control('{"event":"command","func":"playVideo","args":""}', '*');
        }
        function pauseVideo() {
            _control('{"event":"command","func":"pauseVideo","args":""}', '*');
        }

        $('.ar-watchvideo a').on('click', function(e) {
            e.preventDefault();
            if (!$video) {
                $video = $('<iframe>', {
                    'class': 'video',
                    src: $overlay.data('url'),
                    allowfullscreen: true,
                    webkitallowfullscreen: true,
                    mozallowfullscreen: true,
                    frameborder: 0
                });
                $overlay.find('.embed-responsive').append($video);
            } else {
                playVideo();
            }
            $video.show();
            $overlay.hide().removeClass('hide').fadeIn();
            $html.addClass('show-video');
            $('html,body').animate({scrollTop: 0}, $window.scrollTop()/1.2);
        });

        $('.video-overlay').find('.close-overlay, .faux').click(function(e) {
            e.preventDefault();
            $video.hide();
            $overlay.fadeOut(function() {
                $html.removeClass('show-video');
            });
            pauseVideo();
        });
    })();


    // next click bounce
    // -----------------
    //
    (function() {
        var $bouncer = $('.ar-next').first();
        var done = false;

        function bounce() {
            if (done) {
                return;
            }
            $bouncer.addClass('bounce');
            window.setTimeout(function() {
                $bouncer.removeClass('bounce');
            }, 1000);
            window.setTimeout(bounce, 10 * 1000);
        }

        $(function() {
            window.setTimeout(bounce, 2 * 1000);
        });

        var checker = tools.debounce(function() {
            if ($window.scrollTop() > 200) {
                $window.off('scroll', checker);
                done = true;
            }
        });
        $window.on('scroll', checker);
    })();


    // add to cart!
    // ------------
    //
    $('.ar-product').on('click', function(e) {
        // e.preventDefault();
        console.log('CLICK!'); //REM
    });


    // CSS-vh polyfill
    // ---------------
    //
    // So... things like 100vh are weird in mobile devices where the
    // vh changes because of showing and hiding different bars. So,
    // let's update them on touch devices to pixels (whenever viewport
    // width changes).
    //
    // This does so via extra work by specifying .vh on an element,
    // then various vh values for various responsive widths, e.g.,
    // `vh-sm="100"` means for widths >= 768px (bootstrap terminology)
    // we should apply a min-height:100vh -> pixels.
    //
    // TODO - allow optional min-pixel when min-vh is too small, e.g.,
    // iphone landscape.
    //
    (function() {
        var prefixes = [
            ['vh-lg', 1300],
            ['vh-xs', 641],
            ['vh-sm', 768],
            ['vh-md', 992],
            ['vh-mo', 0],
            ['vh', 0]
        ];

        var last_viewport_width = 0;

        function checkVhs() {
            if (!$html.hasClass('touch')) {
                return;
            }

            var viewport_width = window.innerWidth || $window.width(),
                viewport_height = window.innerHeight || $window.height();

            if (viewport_width === last_viewport_width) {
                return;
            }
            last_viewport_width = viewport_width;

            $('.vh').each(function() {
                var $this = $(this),
                    vhs = $this.data('_vhs');

                if (!vhs) {
                    var data = $this.data();

                    vhs = $.map(prefixes, function(name_width) {
                        var val = data[name_width[0]];
                        return val === undefined ? undefined : {width: name_width[1], vh: val};
                    });
                    $this.data('_vhs', vhs);
                }

                var keyframe_match = tools.Fnl.first(vhs, function(keyframe) {
                    return keyframe.width <= viewport_width;
                });
                var vh = keyframe_match ? keyframe_match.vh : 0;
                var pixels = vh * viewport_height / 100;
                $this.css('min-height', Math.ceil(pixels) + 'px');
            });
        }

        $window.on('resize orientationchange', tools.debounce(checkVhs));

        $(checkVhs); // on-ready

    })();


    // retina hack
    // -----------
    //
    $('[data-2x]').each(function() {
        var $elt = $(this),
            src = $elt.data('2x');
        var img = new Image();
        img.src = src;
        img.onload = function() {
            $elt.attr('src', src);
            $elt = src = null;
        };
    });

    // window.setTimeout(function() {
    //     console.log('CLICK!'); $('.slide-link[href=#preorder]').first().click();
    // }, 200);

})(jQuery, skrollr, this);
