        var swiper = new Swiper('.mySwiper', {
            loop: true,
            spaceBetween: 24,
            slidesPerView: 'auto',
            centeredSlides: false,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                768: {
                    slidesPerView: 3,
                },
            },
        });
