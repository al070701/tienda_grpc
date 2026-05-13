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

        // ahora ya vienen con categoria desde backend
        productosGlobal = productos;

        //guardar nombres (si lo usas en carrito/historial)
        productos.forEach(p => {
            mapaProductos[p.id] = p.nombre;
        });

        //render inicial
        renderProductos(productosGlobal);

        cargarCarrito(); // para actualizar stock en carrito

    })
    .catch(err => {
        console.error("Error:", err);
    });
}

// setInterval(()=>{cargarProductos()},5000);

window.addEventListener("DOMContentLoaded", () => {

    const container =
    document.getElementById("productos-container");

    if(container){
        cargarProductos();
    }
});


function renderProductos(lista){

const container = 
document.getElementById("productos-container");

if(!container){
    console.log("No existe productos-container");
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


window.aplicarFiltros = function(){

    let lista = [...productosGlobal];

    const orden = document.getElementById("orden").value;
    const categoria = document.getElementById("categoria").value;


    // FILTRO POR CATEGORÍA (YA REAL DESDE BACKEND)
    if(categoria !== "todos"){
        lista = lista.filter(p => p.categoria === categoria);
    }


    // ORDEN ALFABÉTICO
    if(orden === "az"){
        lista.sort((a,b)=> a.nombre.localeCompare(b.nombre));
    }

    if(orden === "za"){
        lista.sort((a,b)=> b.nombre.localeCompare(a.nombre));
    }


    // ORDEN POR PRECIO
    if(orden === "precioAsc"){
        lista.sort((a,b)=> a.precio - b.precio);
    }

    if(orden === "precioDesc"){
        lista.sort((a,b)=> b.precio - a.precio);
    }


    // NUEVOS (por ID)
    if(orden === "nuevos"){
        lista.sort((a,b)=> b.id - a.id);
    }


    // render final
    renderProductos(lista);
}
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
        }
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

    if(document.getElementById("sidebar-carrito")){
        return;
    }

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
        const respuestas = await Promise.all(

            carrito.map(async producto => {

                const res = await fetch(API + "/comprar", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        id: producto.id,
                        cantidad: producto.cantidad,
                        usuario: usuario,
                        estado: "preparando"
                    })
                });

                if (!res.ok) {
                    throw new Error("Error al comprar producto");
                }

                return await res.json();
            })
        );

        console.log("Respuestas compra:", respuestas);

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

        cargarCarrito();

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