const API = "http://26.145.132.10:8000";

/* ==============================
LOGIN
============================== */

let mapaProductos = {};

function login(){

const usuario = document.getElementById("usuario").value;
const password = document.getElementById("password").value;

if(usuario && password){

localStorage.removeItem("usuario"); // limpia sesión previa
localStorage.setItem("usuario", usuario);

window.location.href = "tienda.html";

}else{
alert("Completa los campos");
}

}

/* ==============================
UTILIDADES DE CARRITO POR USUARIO
============================== */

function obtenerCarrito(){
    const usuario = localStorage.getItem("usuario");
    return JSON.parse(localStorage.getItem("carrito_" + usuario)) || [];
}

function guardarCarrito(carrito){
    const usuario = localStorage.getItem("usuario");
    localStorage.setItem("carrito_" + usuario, JSON.stringify(carrito));
}

/* ==============================
CARGAR PRODUCTOS
============================== */

if(window.location.pathname.includes("tienda.html")){
    cargarProductos();
}

function cargarProductos(){
    fetch(API + "/productos")
    .then(res => res.json())
    .then(productos => {

        const container = document.getElementById("productos-container");
        container.innerHTML = "";

        productos.forEach(p => {

            mapaProductos[p.id] = p.nombre;

            const card = document.createElement("div");
            card.className = "col-md-4 mb-4";

            card.innerHTML = `
            <div class="card shadow h-100">

            <img src="${API}/images/${escapeHtml(p.imagen)}"
            class="card-img-top">

            <div class="card-body">

            <h5>${escapeHtml(p.nombre)}</h5>

            <p>Precio: $${p.precio}</p>

            <button class="btn btn-info btn-sm me-2"
            onclick="verMas('${escapeHtml(p.nombre)}',${p.precio},${p.stock},'${escapeHtml(p.imagen)}')">
            Ver más
            </button>

            ${
            p.stock > 0
            ?
            `<button class="btn btn-success btn-sm"
            onclick="agregarCarrito(${p.id},'${escapeHtml(p.nombre)}',${p.precio},${p.stock})">
            Agregar
            </button>`
            :
            `<span class="badge bg-danger">SIN STOCK</span>`
            }

            </div>
            </div>
            `;

            container.appendChild(card);
        });
    });
}

setInterval(()=>{cargarProductos()},5000);

/* ==============================
ESCAPE HTML
============================== */

function escapeHtml(text){
    const map={
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#039;'
    };
    return text.replace(/[&<>"']/g,m=>map[m]);
}

/* ==============================
VER MÁS
============================== */

function verMas(nombre,precio,stock,imagen){

Swal.fire({
title:nombre,
html:`
<img src="${API}/images/${imagen}" width="200">
<p><b>Precio:</b> $${precio}</p>
<p><b>Stock:</b> ${stock}</p>
`,
icon:"info"
});

}

/* ==============================
AGREGAR CARRITO
============================== */

function agregarCarrito(id,nombre,precio,stock){

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
cantidad:1
});

}

guardarCarrito(carrito);

Swal.fire("Agregado","Producto agregado","success");

}

/* ==============================
IR CARRITO
============================== */

function irCarrito(){
window.location.href="carrito.html";
}

/* ==============================
LOGOUT
============================== */

function logout(){

localStorage.removeItem("usuario");

window.location.href="login.html";

}

/* ==============================
CARGAR CARRITO
============================== */

if(window.location.pathname.includes("carrito.html")){
cargarCarrito();
}

function cargarCarrito(){

let carrito=obtenerCarrito();

const container=document.getElementById("carrito-container");

container.innerHTML="";

let total=0;

carrito.forEach((producto,index)=>{

total+=producto.precio*producto.cantidad;

container.innerHTML+=`
<div class="card mb-3 p-3">

<h5>${escapeHtml(producto.nombre)}</h5>

<p>Precio: $${producto.precio}</p>

<div class="d-flex align-items-center">

<button class="btn btn-secondary btn-sm"
onclick="cambiarCantidad(${index},-1)">-</button>

<span class="mx-2">${producto.cantidad}</span>

<button class="btn btn-secondary btn-sm"
onclick="cambiarCantidad(${index},1)">+</button>

</div>

<button class="btn btn-danger btn-sm mt-2"
onclick="eliminarProducto(${index})">
Eliminar
</button>

</div>
`;
});

document.getElementById("total").innerText=total;

}

/* ==============================
CAMBIAR CANTIDAD
============================== */

function cambiarCantidad(index,cambio){

let carrito=obtenerCarrito();

let producto=carrito[index];

if(cambio>0 && producto.cantidad+1>producto.stock){

Swal.fire(
"Stock insuficiente",
"Solo quedan "+producto.stock,
"warning"
);

return;

}

producto.cantidad+=cambio;

if(producto.cantidad<=0){
carrito.splice(index,1);
}

guardarCarrito(carrito);

cargarCarrito();

}

/* ==============================
ELIMINAR PRODUCTO
============================== */

function eliminarProducto(index){

let carrito=obtenerCarrito();

carrito.splice(index,1);

guardarCarrito(carrito);

cargarCarrito();

}

/* ==============================
PAGO
============================== */

function mostrarPago(){

let carrito=obtenerCarrito();

if(carrito.length===0){
Swal.fire("Carrito vacío");
return;
}

Swal.fire({

title:"Datos de Pago",

html:`
<input id="tarjeta" class="swal2-input"
placeholder="Tarjeta (16 dígitos)"
maxlength="16"
inputmode="numeric"
oninput="this.value=this.value.replace(/[^0-9]/g,'')">

<input id="nip" class="swal2-input"
placeholder="NIP (4 dígitos)"
maxlength="4"
inputmode="numeric"
oninput="this.value=this.value.replace(/[^0-9]/g,'')">
`,

confirmButtonText:"Pagar",
showCancelButton:true,

preConfirm:()=>{

let tarjeta=document.getElementById("tarjeta").value;
let nip=document.getElementById("nip").value;

/* validar tarjeta */

if(!/^[0-9]{16}$/.test(tarjeta)){
Swal.showValidationMessage("La tarjeta debe tener 16 números");
return false;
}

/* validar nip */

if(!/^[0-9]{4}$/.test(nip)){
Swal.showValidationMessage("El NIP debe tener 4 números");
return false;
}

return {tarjeta,nip};

}

}).then(result=>{

if(result.isConfirmed){
procesarPago();
}

});

}

/* ==============================
PROCESAR PAGO
============================== */

async function procesarPago(){

let carrito = obtenerCarrito();
const usuario = localStorage.getItem("usuario");

for(let producto of carrito){

await fetch(API + "/comprar",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
id:producto.id,
cantidad:producto.cantidad,
usuario:usuario
})

});

}

Swal.fire("Pago exitoso","Compra realizada","success");

localStorage.removeItem("carrito_" + usuario);

cargarCarrito();

}

/* ==============================
HISTORIAL
============================== */

function irHistorial(){
window.location.href="historial.html";
}

function volverTienda(){
    window.location.href = "tienda.html";
}