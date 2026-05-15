const API = window.location.origin;

import { auth }
from "./firebase.js";

import {
signOut,
onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

/* ==============================
PROTEGER PAGINAS
============================== */

const paginasProtegidas = [

    "perfil.html",
    "historial.html"

];

const paginaActual =
window.location.pathname;

const protegida =
paginasProtegidas.some(
p => paginaActual.includes(p)
);

if(protegida){

    onAuthStateChanged(auth,(user)=>{

        if(!user){

            window.location.href =
            "login.html";
        }
    });
}

/* ==============================
LOGIN
============================== */

let mapaProductos = {};
let productosGlobal = [];

function actualizarTituloCarrito(){

    const titulo =
    document.getElementById("titulo-carrito");

    if(!titulo){
        return;
    }

    const user = auth.currentUser;

    if(
        user &&
        user.displayName &&
        user.displayName.trim() !== ""
    ){

        titulo.innerText =
        `🛒 Carrito de ${user.displayName}`;

    }else{

        titulo.innerText =
        "Carrito";
    }
}

onAuthStateChanged(auth,()=>{
    
    actualizarTituloCarrito();
    cargarCarrito();
});

window.irInicio = function(){
    window.location.href = "index.html";
}


window.irProductos = function(){
    window.location.href = "tienda.html";
}

window.irAcerca = function(){
    window.location.href = "acerca.html";
}

window.irContacto = function(){
    window.location.href = "contacto.html";
}

window.irCarrito = function(){
    window.abrirCarrito();
}

window.irPerfil = function(){
    window.location.href = "perfil.html";
}

function obtenerClaveCarrito(){
    return "carrito";
}

/* ==============================
UTILIDADES DE CARRITO POR USUARIO
============================== */

function obtenerCarrito(){
    return JSON.parse(
        localStorage.getItem("carrito")
    ) || [];
}

function guardarCarrito(carrito){

    localStorage.setItem(
        "carrito",
        JSON.stringify(carrito)
    );
}

/* ==============================
CARGAR PRODUCTOS
============================== */

function cargarProductos(){
    
    fetch(API + "/productos")
    .then(res => {
        if (!res.ok) throw new Error("Error en la API");
        return res.json();
    })
    .then(productos => {

        console.log(productos);

        productosGlobal = productos;

        productos.forEach(p => {
            mapaProductos[p.id] = p.nombre;
        });

        const container = document.getElementById("productos-container");

        if(container){
            window.aplicarFiltros();
        }

        cargarCarrito();
    })
    .catch(err => {
        console.error("Error:", err);
    });
}

async function refrescarProductos(){
    try {
        const res = await fetch(API + "/productos");

        if (!res.ok) {
            throw new Error("Error al refrescar productos");
        }

        const productos = await res.json();

        productosGlobal = productos;

        productos.forEach(p => {
            mapaProductos[p.id] = p.nombre;
        });

        const container = document.getElementById("productos-container");

        if(container){
            window.aplicarFiltros();
        }

        cargarCarrito();

        return productosGlobal;

    } catch (error) {
        console.error("Error refrescando productos:", error);
    }
}

setInterval(()=>{cargarProductos()},5000);

window.addEventListener("DOMContentLoaded", () => {

    const selectOrden = document.getElementById("orden");
    const selectCategoria = document.getElementById("categoria");

    const ordenGuardado = localStorage.getItem("filtro_orden");
    const categoriaGuardada = localStorage.getItem("filtro_categoria");

    if(selectOrden && ordenGuardado){
        selectOrden.value = ordenGuardado;
    }

    if(selectCategoria && categoriaGuardada){
        selectCategoria.value = categoriaGuardada;
    }

    const container = document.getElementById("productos-container");

    if(container){
        refrescarProductos();
    }

}, 5000);


function renderProductos(lista){

const container = 
document.getElementById("productos-container");

if(!container){
    return;
}

container.innerHTML = "";

lista.forEach(p => {

container.innerHTML += `
<div class="bg-[#fcd3fe] rounded-2xl overflow-hidden shadow-md pt-4">

    <img
        src="${API}/images/${escapeHtml(p.imagen)}"
        class="w-full h-72 object-scale-down"
        alt="${escapeHtml(p.nombre)}">

    <div class="p-8 bg-white">

        <h3 class="text-2xl font-bold font-dynapuff text-[#5ee1e6]">
            ${escapeHtml(p.nombre)}
        </h3>

        <div class="flex justify-between items-center mt-3">

            <p class="text-[#d26ae6] font-bold font-viga text-xl">
                $${p.precio}
            </p>

            ${
            p.stock > 0
            ?
            `<button
                onclick="mostrarProducto(${p.id})"
                class="bg-cyan-400 text-white px-6 py-2 rounded-xl font-viga text-xl flex items-center gap-2">
                Agregar  
                <svg width="21" height="21" fill="currentColor">
                    <use href="../assets/sprite.svg#carrito" />
                </svg>
            </button>`
            :
            `<span class="text-[#d26ae6] font-bold">
                Sin stock
            </span>`
            }

        </div>

    </div>

</div>
`;

});

}

function obtenerListaFiltrada(){

    let lista = [...productosGlobal];

    const selectOrden = document.getElementById("orden");
    const selectCategoria = document.getElementById("categoria");

    const orden = selectOrden ? selectOrden.value : "normal";
    const categoria = selectCategoria ? selectCategoria.value : "todos";

    // Guardar filtros seleccionados
    localStorage.setItem("filtro_orden", orden);
    localStorage.setItem("filtro_categoria", categoria);

    // FILTRO POR CATEGORÍA
    if(categoria !== "todos"){
        lista = lista.filter(p => p.categoria === categoria);
    }

    // ORDEN ALFABÉTICO
    if(orden === "az"){
        lista.sort((a,b) => a.nombre.localeCompare(b.nombre));
    }

    if(orden === "za"){
        lista.sort((a,b) => b.nombre.localeCompare(a.nombre));
    }

    // ORDEN POR PRECIO
    if(orden === "precioAsc"){
        lista.sort((a,b) => Number(a.precio) - Number(b.precio));
    }

    if(orden === "precioDesc"){
        lista.sort((a,b) => Number(b.precio) - Number(a.precio));
    }

    // NUEVOS
    if(orden === "nuevos"){
        lista.sort((a,b) => Number(b.id) - Number(a.id));
    }

    return lista;
}

window.aplicarFiltros = function(){

    if(!productosGlobal || productosGlobal.length === 0){
        return;
    }

    let lista = [...productosGlobal];

    const selectOrden = document.getElementById("orden");
    const selectCategoria = document.getElementById("categoria");

    if(!selectOrden || !selectCategoria){
        renderProductos(lista);
        return;
    }

    const orden = selectOrden.value;
    const categoria = selectCategoria.value;

    localStorage.setItem("filtro_orden", orden);
    localStorage.setItem("filtro_categoria", categoria);

    if(categoria !== "todos"){
        lista = lista.filter(p =>
            String(p.categoria).trim().toLowerCase() ===
            String(categoria).trim().toLowerCase()
        );
    }

    if(orden === "az"){
        lista.sort((a,b) => a.nombre.localeCompare(b.nombre));
    }

    if(orden === "za"){
        lista.sort((a,b) => b.nombre.localeCompare(a.nombre));
    }

    if(orden === "precioAsc"){
        lista.sort((a,b) => Number(a.precio) - Number(b.precio));
    }

    if(orden === "precioDesc"){
        lista.sort((a,b) => Number(b.precio) - Number(a.precio));
    }

    if(orden === "nuevos"){
        lista.sort((a,b) => Number(b.id) - Number(a.id));
    }

    renderProductos(lista);
};

/* ==============================
ESCAPE HTML
============================== */

function escapeHtml(text){

    if(text === undefined || text === null){
        return "";
    }

    const map = {
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#039;'
    };

    return String(text).replace(/[&<>"']/g,m=>map[m]);

}

/* ==============================
VER MÁS
============================== */

window.mostrarProducto = function(id){
    const producto = productosGlobal.find(p => Number(p.id) === Number(id)
    );
    
    if(!producto){
        Swal.fire("Producto no encontrado");
        return;
    }

    Swal.fire({
        title: producto.nombre,
        html: `
        <div class="flex flex-col items-center">
        <img src="${API}/images/${producto.imagen}" class="w-52 h-52 object-contain mb-4 rounded-xl">
        <p class="text-gray-600 mb-4">
        ${producto.descripcion || "Delicioso taiyaki recién hecho"}
        </p>
        <div class="text-left w-full space-y-2">
        
        <p>
        <b>Precio:</b> $${producto.precio}
        </p>
        
        <p>
        <b>Stock:</b> ${producto.stock}
        </p>
        </div>
        </div>
        `,
        
        showCancelButton:true,
        
        confirmButtonText:"Agregar al carrito",
        
        cancelButtonText:"Cancelar",
        
        confirmButtonColor:"#22d3ee",
        
        preConfirm:()=>{
            
            if(producto.stock<=0){
                Swal.showValidationMessage("Producto sin stock");
                return false;
            }
            return true;
        }
    }).then((result)=>{
        if(result.isConfirmed){
            agregarCarritoReal(
                producto.id,
                producto.nombre,
                producto.precio,
                producto.stock,
                producto.imagen
            );

            cargarCarrito();
        }

    });
}

window.ordenarProductoInicio = function(id){

    if(productosGlobal.length > 0){
        window.mostrarProducto(id);
        return;
    }

    fetch(API + "/productos")
    .then(res => {
        if (!res.ok) throw new Error("Error en la API");
        return res.json();
    })
    .then(productos => {

        productosGlobal = productos;

        productos.forEach(p => {
            mapaProductos[p.id] = p.nombre;
        });

        window.mostrarProducto(id);

    })
    .catch(err => {
        console.error("Error cargando producto desde inicio:", err);
        Swal.fire("No se pudo cargar el producto");
    });
}



/* ==============================
AGREGAR CARRITO
============================== */

function agregarCarritoReal(id,nombre,precio,stock, imagen){
    if(stock<=0){
        Swal.fire("Sin stock");
        return;
    }
    
    let carrito=obtenerCarrito();
    let producto=carrito.find(p=>p.id===id);
    let cantidadActual=producto?producto.cantidad:0;
    
    if(cantidadActual+1>stock){
        Swal.fire(
            "Stock insuficiente",
            "Solo quedan "+stock+" unidades",
            "warning"
        );
        return;
    }
    
    if(producto){
        producto.cantidad++;
    }else{
        
        carrito.push({
            id:id,
            nombre:nombre,
            precio:precio,
            stock:stock,
            imagen: imagen,
            cantidad:1
        });
    }
    guardarCarrito(carrito);

    abrirCarrito();
    cargarCarrito();
}

/* ==============================
crear carrito global
============================== */

function crearCarritoGlobal(){

    document.getElementById("sidebar-carrito")?.remove();
    document.getElementById("overlay-carrito")?.remove();

    const overlay = document.createElement("div");

    overlay.id = "overlay-carrito";
    overlay.className = "fixed inset-0 bg-black/40 hidden z-40";
    overlay.onclick = window.cerrarCarrito;

    const sidebar = document.createElement("div");

    sidebar.id = "sidebar-carrito";
    sidebar.className = "fixed top-0 right-[-500px] w-[400px] h-full bg-white shadow-2xl z-50 transition-all duration-300 flex flex-col";

    sidebar.innerHTML = `
        <!-- HEADER -->
        <div class="p-4 border-b flex justify-between items-center">

            <h2 id="titulo-carrito" class="text-2xl font-bold text-cyan-400">
                Carrito
            </h2>

            <button
            onclick="cerrarCarrito()"
            class="text-2xl font-bold">
                ✕
            </button>

        </div>

        <!-- PRODUCTOS -->
        <div
        id="carrito-container"
        class="flex-1 overflow-y-auto p-4 space-y-4">
        </div>

        <!-- FOOTER -->
        <div class="border-t p-4">

            <div class="flex justify-between text-xl font-bold mb-4">
                <span>Total:</span>
                <span>$<span id="total">0</span></span>
            </div>

            <button
            onclick="mostrarPago()"
            class="w-full bg-cyan-400 text-white py-3 rounded-xl font-bold">
                Comprar
            </button>

        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);

    actualizarTituloCarrito();
}

/* ==============================
funcion abrirCarrito
============================== */

window.abrirCarrito = function(){

    crearCarritoGlobal();

    const sidebar =
    document.getElementById("sidebar-carrito");

    const overlay =
    document.getElementById("overlay-carrito");

    sidebar.style.right = "0";

    overlay.classList.remove("hidden");

    cargarCarrito();
}

/* ==============================
funcion cerrarCarrito
============================== */

window.cerrarCarrito = function(){

    const sidebar =
    document.getElementById("sidebar-carrito");

    const overlay =
    document.getElementById("overlay-carrito");

    if(!sidebar || !overlay){
        return;
    }

    sidebar.style.right = "-500px";

    overlay.classList.add("hidden");
}

/* ==============================
LOGOUT
============================== */

window.logout = async function(){
    
    await signOut(auth);
    window.location.href =
        "login.html";
}

/* ==============================
CARGAR CARRITO
============================== */

function cargarCarrito(){

let carrito=obtenerCarrito();

const container=
document.getElementById("carrito-container");

const totalElemento = 
document.getElementById("total");

if(!container || !totalElemento){
    return;
}

container.innerHTML="";

if(carrito.length === 0){

    container.innerHTML = `
    
    <div class="text-center py-10">
    
        <p class="text-gray-500 text-lg font-bold">
            Carrito vacío
        </p>

    </div>
    `;

    totalElemento.innerText = 0;

    return;
}

let total=0;

carrito.forEach((producto,index)=>{
    
    total += producto.precio * producto.cantidad;
    
    const productoReal = productosGlobal.find(
    p => Number(p.id) === Number(producto.id)
);

const stockReal = productoReal 
? productoReal.stock 
: producto.stock; // fallback al stock del producto en carrito

container.innerHTML+= `


<div class="card mb-3 p-3">
    <img src="${API}/images/${producto.imagen}" class="w-20 h-20 object-contain rounded-xl">
    
    <div class="flex-1">
        <h3 class="font-bold text-lg">
            ${escapeHtml(producto.nombre)}
        </h3>
        
        <p class="text-cyan-500 font-bold">$${producto.precio}</p>
        
        <p class="text-sm text-gray-500">Stock: ${stockReal}</p>
            
        <!-- CONTADOR -->
            <div class="flex items-center gap-2 mt-2">
            <button onclick="cambiarCantidad(${index},-1)" class="bg-gray-200 px-3 rounded"> - </button>
            
            <span class="font-bold">${producto.cantidad}</span>
            
            <button onclick="cambiarCantidad(${index},1)" class="bg-gray-200 px-3 rounded"> + </button>
        </div>
        
                <!-- SUBTOTAL -->
                <p class="mt-2 font-bold"> Subtotal: $${producto.precio * producto.cantidad}</p>
        
                <!-- ELIMINAR -->
                <button onclick="eliminarProducto(${index})"  class="text-red-500 mt-2 text-sm"> Eliminar </button>
            </div>
        </div>
        `;
    });
    totalElemento.innerText = total;
}

/* ==============================
CAMBIAR CANTIDAD
============================== */

window.cambiarCantidad = function(index, cambio){

    let carrito = obtenerCarrito();

    let producto = carrito[index];

    if(!producto){
        return;
    }

    const productoReal = productosGlobal.find(
        p => Number(p.id) === Number(producto.id)
    );

    const stockDisponible = productoReal
        ? productoReal.stock
        : producto.stock;

    if(cambio > 0 && producto.cantidad + 1 > stockDisponible){

        Swal.fire(
            "Stock insuficiente",
            "Solo quedan " + stockDisponible + " unidades",
            "warning"
        );

        return;
    }

    producto.cantidad += cambio;

    if(producto.cantidad <= 0){
        carrito.splice(index, 1);
    }

    guardarCarrito(carrito);

    cargarCarrito();
}

/* ==============================
ELIMINAR PRODUCTO
============================== */

window.eliminarProducto = function(index){

let carrito=obtenerCarrito();

carrito.splice(index,1);

guardarCarrito(carrito);

cargarCarrito();

}

function generarTarjetaSimulada(){

    const numero =
        "4242 " +
        String(Math.floor(1000 + Math.random() * 9000)) + " " +
        String(Math.floor(1000 + Math.random() * 9000)) + " " +
        String(Math.floor(1000 + Math.random() * 9000));

    const mes =
        String(Math.floor(1 + Math.random() * 12)).padStart(2, "0");

    const anio =
        String(Math.floor(27 + Math.random() * 6));

    const cvv =
        String(Math.floor(100 + Math.random() * 900));

    return {
        numero,
        numeroLimpio: numero.replace(/\s/g, ""),
        fecha: `${mes}/${anio}`,
        cvv
    };
}

/* ==============================
VALIDAR STOCK REAL ANTES DE PAGAR
============================== */

async function validarCarritoConStockActual(){

    let carrito = obtenerCarrito();

    if(carrito.length === 0){

        Swal.fire(
            "Carrito vacío",
            "No tienes productos en el carrito.",
            "warning"
        );

        return false;
    }

    try{

        const res = await fetch(API + "/productos");

        if(!res.ok){
            throw new Error("No se pudo consultar el stock actual");
        }

        const productosActuales = await res.json();

        let carritoActualizado = [];
        let huboCambios = false;

        carrito.forEach(item => {

            const productoActual = productosActuales.find(
                p => Number(p.id) === Number(item.id)
            );

            if(!productoActual){

                huboCambios = true;
                return;
            }

            const stockDisponible = Number(productoActual.stock);

            if(stockDisponible <= 0){

                huboCambios = true;
                return;
            }

            if(Number(item.cantidad) > stockDisponible){

                item.cantidad = stockDisponible;
                item.stock = stockDisponible;
                huboCambios = true;

            }else{

                item.stock = stockDisponible;
            }

            carritoActualizado.push(item);
        });

        guardarCarrito(carritoActualizado);

        productosGlobal = productosActuales;

        cargarCarrito();

        const container = document.getElementById("productos-container");

        if(container){
            renderProductos(productosGlobal);
        }

        if(carritoActualizado.length === 0){

            Swal.fire(
                "Sin stock",
                "Los productos de tu carrito ya no están disponibles.",
                "warning"
            );

            return false;
        }

        if(huboCambios){

            Swal.fire(
                "Carrito actualizado",
                "Algunos productos cambiaron porque otra persona compró antes. Ajustamos tu carrito al stock disponible.",
                "info"
            );

            return false;
        }

        return true;

    }catch(error){

        console.error("Error validando stock:", error);

        Swal.fire(
            "Error de conexión",
            "No se pudo revisar el stock actual antes del pago. Intenta de nuevo.",
            "error"
        );

        return false;
    }
}

/* ==============================
PAGO
============================== */

window.mostrarPago = function () {

    const user = auth.currentUser;

    if (!user) {

        Swal.fire({
            title: "Debes iniciar sesión",
            text: "Necesitas iniciar sesión para comprar",
            icon: "warning",
            confirmButtonText: "Ir al login",
            showCancelButton: true
        }).then((result) => {

            if (result.isConfirmed) {
                window.location.href = "login.html";
            }
        });

        return;
    }

    let carrito = obtenerCarrito();

    if (carrito.length === 0) {

        Swal.fire(
            "Carrito vacío"
        );

        return;
    }

carrito = obtenerCarrito();


    const tarjetaSimulada = generarTarjetaSimulada();

    Swal.fire({

        title: "Pago Seguro",

        width: 700,

        html: `

        <div class="space-y-5 text-left">

            <!-- TARJETA VISUAL -->

            <div class="bg-gradient-to-r from-cyan-400 to-blue-500 rounded-3xl p-6 text-white shadow-xl">

                <div class="flex justify-between items-center mb-10">
                    <h3 class="text-2xl font-bold">VISA</h3>
                    <span class="text-sm">Pago simulado</span>
                </div>

                <p id="preview-numero"
                class="text-2xl tracking-[4px] mb-6 font-bold">
                **** **** **** ****
                </p>

                <div class="flex justify-between items-end">

                    <div>
                        <p class="text-xs opacity-80">Titular</p>
                        <p id="preview-nombre"
                        class="font-bold uppercase">
                            NOMBRE COMPLETO
                        </p>
                    </div>

                    <div>
                        <p class="text-xs opacity-80">Expira</p>
                        <p id="preview-fecha"
                        class="font-bold">
                            MM/AA
                        </p>
                    </div>

                </div>

            </div>

            <div class="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 text-sm">
            <p class="font-bold text-yellow-700 mb-2">
            Tarjeta simulada para esta compra
            </p>

            <p><b>Número:</b> ${tarjetaSimulada.numero}</p>
            <p><b>Fecha:</b> ${tarjetaSimulada.fecha}</p>
            <p><b>CVV:</b> ${tarjetaSimulada.cvv}</p>

            <p class="text-gray-500 mt-2">
                Copia estos datos en los campos para aprobar el pago.
            </p>
        </div>

            <!-- INPUTS -->

            <input
            id="titular"
            class="swal2-input"
            placeholder="Nombre del titular"
            maxlength="30"
            autocomplete="cc-name">

            <input
            id="tarjeta"
            class="swal2-input"
            placeholder="4242 4242 4242 4242"
            maxlength="19"
            inputmode="numeric"
            autocomplete="cc-number">

            <div class="flex gap-3">

                <input
                id="fecha"
                class="swal2-input"
                placeholder="MM/AA"
                maxlength="5"
                inputmode="numeric"
                autocomplete="cc-exp">

                <input
                id="cvv"
                class="swal2-input"
                placeholder="CVV"
                maxlength="3"
                inputmode="numeric"
                autocomplete="cc-csc">

            </div>

        </div>
        `,

        didOpen: () => {

            const tarjeta = document.getElementById("tarjeta");
            const titular = document.getElementById("titular");
            const fecha = document.getElementById("fecha");

            tarjeta.addEventListener("input", () => {

                tarjeta.value = tarjeta.value
                    .replace(/\D/g, '')
                    .replace(/(.{4})/g, '$1 ')
                    .trim();

                document.getElementById("preview-numero")
                    .innerText =
                    tarjeta.value || "4242 4242 4242 4242";
            });

            titular.addEventListener("input", () => {

                document.getElementById("preview-nombre")
                    .innerText =
                    titular.value.toUpperCase() || "NOMBRE COMPLETO";
            });

            fecha.addEventListener("input", () => {

                fecha.value = fecha.value
                    .replace(/\D/g, '')
                    .replace(/(\d{2})(\d)/, '$1/$2');

                document.getElementById("preview-fecha")
                    .innerText =
                    fecha.value || "08/29";
            });
        },

        confirmButtonText: "Pagar",

        showCancelButton: true,

        preConfirm: () => {

            const titular =
                document.getElementById("titular").value.trim();

            const tarjeta =
                document.getElementById("tarjeta").value.replace(/\s/g, '');

            const fecha =
                document.getElementById("fecha").value;

            const cvv =
                document.getElementById("cvv").value;

            // VALIDAR TITULAR

            if (titular.length < 5) {

                Swal.showValidationMessage(
                    "Ingresa un nombre válido"
                );

                return false;
            }

            // VALIDAR TARJETA

            if (!/^\d{16}$/.test(tarjeta)) {

                Swal.showValidationMessage(
                    "La tarjeta debe tener 16 dígitos"
                );

                return false;
            }

            // VALIDAR FECHA

            if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(fecha)) {

                Swal.showValidationMessage(
                    "Fecha inválida"
                );

                return false;
            }

            // VALIDAR CVV

            if (!/^\d{3}$/.test(cvv)) {

                Swal.showValidationMessage(
                    "CVV inválido"
                );

                return false;
            }
            
            if(tarjeta !== tarjetaSimulada.numeroLimpio){
                
                Swal.showValidationMessage(
                    "Número de tarjeta incorrecto para esta compra"
                 );
                 return false;
                }
                
                if(fecha !== tarjetaSimulada.fecha){
                    Swal.showValidationMessage(
                        "Fecha incorrecta para esta compra"
                    );
                    return false;
                }
                
                if(cvv !== tarjetaSimulada.cvv){
                    Swal.showValidationMessage(
                        "CVV incorrecto para esta compra"
                    );

                    return false;
                }
                return {
                titular,
                tarjeta,
                fecha,
                cvv
            };
            
        }

    }).then(async (result) => {

        if (result.isConfirmed) {

            Swal.fire({
                title: "Procesando pago...",
                text: "No cierres la ventana",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            setTimeout(async () => {

                await procesarPago();

            }, 2000);
        }
    });
};

/* ==============================
PROCESAR PAGO
============================== */

async function procesarPago() {

    const user = auth.currentUser;

    if (!user) {
        return;
    }

    const carritoValido = await validarCarritoConStockActual();

    if(!carritoValido){
        return;
    }

    let carrito = obtenerCarrito();

    const usuario = user.email;

    let total = 0;
    let listaProductos = "";

    for (let producto of carrito) {

        total += producto.precio * producto.cantidad;

        listaProductos +=
            `• ${producto.nombre} x${producto.cantidad} - $${producto.precio * producto.cantidad}\n`;
    }

    try {

        // 1. PROCESAR COMPRA EN BACKEND
        const resCompra = await fetch(API + "/comprar-carrito", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
            usuario: usuario,
            items: carrito.map(producto => ({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            cantidad: producto.cantidad
        }))
    })
});
if (!resCompra.ok) {
    const errorData = await resCompra.json();
    throw new Error(errorData.detail || "Error al procesar la compra");
}
const compra = await resCompra.json();

console.log("Compra realizada:", compra);


        // 2. INTENTAR ENVIAR TICKET, PERO SIN ROMPER LA COMPRA
        let correoEnviado = false;

        try {

            if (window.emailjs) {

                window.emailjs.init(
                    "y1qKtmOFoe4ztqBjW"
                );

                await window.emailjs.send(
                    "service_a1dic82",
                    "template_6qjm12s",
                    {
                        nombre:
                            user.displayName || usuario,

                        correo: usuario,

                        productos: listaProductos,

                        total: total
                    }
                );

                correoEnviado = true;
            }

        } catch (errorCorreo) {

            console.warn(
                "La compra se realizó, pero falló EmailJS:",
                errorCorreo
            );
        }

        // 3. LIMPIAR CARRITO
        localStorage.removeItem("carrito");

        await refrescarProductos();

        // 4. MENSAJE FINAL
        if (correoEnviado) {

            Swal.fire({
                icon: "success",
                title: "Pedido realizado",
                text: "Te enviamos el ticket por correo"
            });

        } else {

            Swal.fire({
                icon: "success",
                title: "Pedido realizado",
                text: "La compra fue exitosa. El ticket por correo no está configurado todavía."
            });
        }

    } catch (error) {

        console.log(error);

        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo procesar la compra"
        });
    }
}

/* ==============================
HISTORIAL
============================== */

async function cargarPedidosCliente() {
    const contenedor = document.getElementById("contenedor-pedidos-cliente");

    if (!contenedor) return;

    const usuario = localStorage.getItem("usuario") || "cliente_demo";

    try {
        const respuesta = await fetch(API + "/pedidos/cliente/" + encodeURIComponent(usuario));
        const pedidos = await respuesta.json();

        contenedor.innerHTML = "";

        if (!pedidos.length) {
            contenedor.innerHTML = `
                <p class="text-gray-500 text-center">
                    Aún no tienes compras registradas.
                </p>
            `;
            return;
        }

        pedidos.forEach(pedido => {
            contenedor.innerHTML += crearCardPedidoCliente(pedido);
        });

    } catch (error) {
        console.error("Error al cargar pedidos del cliente:", error);
        contenedor.innerHTML = `
            <p class="text-red-500 text-center">
                No se pudieron cargar tus pedidos.
            </p>
        `;
    }
}

function crearCardPedidoCliente(pedido) {
    const porcentaje = obtenerPorcentajeEstado(pedido.estado);

    const productos = pedido.items.map(item => `
        <li class="text-sm text-gray-600">
            ${item.cantidad} x ${item.nombre} - $${item.subtotal}
        </li>
    `).join("");

    return `
        <div class="bg-white rounded-2xl shadow p-5 mb-5 border">
            <div class="flex justify-between items-center mb-3">
                <div>
                    <h3 class="font-bold text-lg">Pedido ${pedido._id}</h3>
                    <p class="text-sm text-gray-500">
                        Total: $${pedido.total}
                    </p>
                </div>

                <span class="px-3 py-1 rounded-full text-sm font-bold ${obtenerClaseEstado(pedido.estado)}">
                    ${pedido.estado}
                </span>
            </div>

            <ul class="mb-4">
                ${productos}
            </ul>

            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-2">
                <div 
                    class="h-4 rounded-full transition-all duration-700 ${pedido.estado === "Rechazado" ? "bg-red-400" : "bg-cyan-400"}"
                    style="width: ${porcentaje}%;">
                </div>
            </div>

            <div class="flex justify-between text-xs text-gray-500 font-semibold">
                <span>En preparación</span>
                <span>En camino</span>
                <span>Entregado</span>
            </div>

            ${
                pedido.estado === "Rechazado"
                    ? `<p class="mt-3 text-sm text-red-500 font-semibold">
                        Motivo: ${pedido.motivo_rechazo || "Compra rechazada por administración"}
                       </p>`
                    : ""
            }
        </div>
    `;
}

function obtenerPorcentajeEstado(estado) {
    if (estado === "En preparación") return 33;
    if (estado === "En camino") return 66;
    if (estado === "Entregado") return 100;
    if (estado === "Rechazado") return 100;
    return 0;
}

function obtenerClaseEstado(estado) {
    if (estado === "En preparación") return "bg-yellow-100 text-yellow-700";
    if (estado === "En camino") return "bg-blue-100 text-blue-700";
    if (estado === "Entregado") return "bg-green-100 text-green-700";
    if (estado === "Rechazado") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
}

function crearCardPedidoAdmin(pedido) {
    const productos = pedido.items.map(item => `
        <li class="text-sm text-gray-600">
            ${item.cantidad} x ${item.nombre} - $${item.subtotal}
        </li>
    `).join("");

    return `
        <div class="bg-white rounded-2xl shadow p-5 mb-5 border">
            <div class="flex justify-between items-center mb-3">
                <div>
                    <h3 class="font-bold text-lg">Pedido ${pedido._id}</h3>
                    <p class="text-sm text-gray-500">Cliente: ${pedido.usuario}</p>
                    <p class="text-sm text-gray-500">Total: $${pedido.total}</p>
                </div>

                <span class="px-3 py-1 rounded-full text-sm font-bold ${obtenerClaseEstado(pedido.estado)}">
                    ${pedido.estado}
                </span>
            </div>

            <ul class="mb-4">
                ${productos}
            </ul>

            <div class="flex gap-2 flex-wrap">
                <button onclick="actualizarEstadoPedido('${pedido._id}', 'En preparación')"
                    class="px-3 py-2 rounded-xl bg-yellow-100 text-yellow-700 font-bold">
                    En preparación
                </button>

                <button onclick="actualizarEstadoPedido('${pedido._id}', 'En camino')"
                    class="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 font-bold">
                    En camino
                </button>

                <button onclick="actualizarEstadoPedido('${pedido._id}', 'Entregado')"
                    class="px-3 py-2 rounded-xl bg-green-100 text-green-700 font-bold">
                    Entregado
                </button>

                <button onclick="rechazarPedido('${pedido._id}')"
                    class="px-3 py-2 rounded-xl bg-red-100 text-red-700 font-bold">
                    Rechazar
                </button>
            </div>
        </div>
    `;
}

async function rechazarPedido(pedidoId) {
    const motivo = prompt("Escribe el motivo del rechazo:");

    if (motivo === null) return;

    try {
        const respuesta = await fetch(API + "/admin/pedidos/" + pedidoId + "/estado", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                estado: "Rechazado",
                motivo_rechazo: motivo || "Compra rechazada por administración"
            })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            alert(data.detail || "No se pudo rechazar el pedido");
            return;
        }

        alert("Pedido rechazado");
        cargarPedidos();

    } catch (error) {
        console.error("Error al rechazar pedido:", error);
        alert("Error al rechazar el pedido");
    }
}


window.irHistorial = function(){
window.location.href="historial.html";
}

window.volverTienda = function(){
    window.location.href = "tienda.html";
}

window.irLogin = function(){

    const paginaActual =
        window.location.pathname.split("/").pop();

    window.location.href =
        "login.html?volver=" + encodeURIComponent(paginaActual);
}