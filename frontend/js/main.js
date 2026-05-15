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

        function abrirBuscador() {
    const modal = document.getElementById("modal-buscador");
    const input = document.getElementById("input-buscador");

    if (!modal || !input) return;

    modal.classList.remove("hidden");

    setTimeout(() => {
        input.focus();
    }, 100);
}

function cerrarBuscador() {
    const modal = document.getElementById("modal-buscador");

    if (!modal) return;

    modal.classList.add("hidden");
}

function buscarProductoNav() {
    const input = document.getElementById("input-buscador");

    if (!input) return;

    const busqueda = input.value.trim();

    if (busqueda === "") {
        Swal.fire({
            icon: "warning",
            title: "Campo vacío",
            text: "Escribe algo como taiyaki, gomitas, cereza o taro.",
            confirmButtonColor: "#5ee1e6"
        });
        return;
    }

    window.location.href = `tienda.html?buscar=${encodeURIComponent(busqueda)}`;
}

function buscarConEnter(event) {
    if (event.key === "Enter") {
        buscarProductoNav();
    }
}