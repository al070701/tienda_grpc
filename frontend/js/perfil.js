import { auth }
from "./firebase.js";

import {
signOut,
updateProfile,
EmailAuthProvider,
reauthenticateWithCredential,
updatePassword,
onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

const API = window.location.origin;

/* =========================
PROTEGER PERFIL
========================= */

let intervaloPedidos = null;

window.volverInicio = function(){
    window.location.href = "index.html";
};

onAuthStateChanged(auth,(user)=>{

    if(!user){
        window.location.href = "login.html";
        return;
    }

    cargarDatos(user);
    cargarPedidos();

    const seccionGuardada = localStorage.getItem("seccion_perfil") || "cuenta";
    mostrarSeccion(seccionGuardada);

if(intervaloPedidos){
        clearInterval(intervaloPedidos);
    }

    intervaloPedidos = setInterval(() => {

        const contenedor = document.getElementById("contenedor-pedidos-cliente");

        if(contenedor){
            cargarPedidos();
        }

    }, 5000);
});

/* =========================
CARGAR DATOS
========================= */

function cargarDatos(user){

    document.getElementById("correo").value =
    user.email;

    document.getElementById("nombre").value =
    user.displayName || "";
}

/* =========================
CAMBIAR SECCIONES
========================= */

window.mostrarSeccion = function(id){

    document
    .querySelectorAll("main section")
    .forEach(sec=>{
        sec.classList.add("hidden");
    });

    const seccion = document.getElementById(id);

    if(seccion){
        seccion.classList.remove("hidden");
        localStorage.setItem("seccion_perfil", id);
    }
};

/* =========================
GUARDAR NOMBRE
========================= */

window.guardarNombre = async function(){

    try{

        const nombre =
        document
        .getElementById("nombre")
        .value
        .trim();

        if(nombre.length < 3){

            Swal.fire(
                "Nombre inválido",
                "El nombre debe tener al menos 3 caracteres",
                "warning"
            );

            return;
        }

        if(!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)){

            Swal.fire(
                "Nombre inválido",
                "Solo se permiten letras",
                "warning"
            );

            return;
        }

        await updateProfile(
            auth.currentUser,
            {
                displayName:nombre
            }
        );

        Swal.fire(
            "Guardado",
            "Nombre actualizado",
            "success"
        );

    }catch(error){

        console.log(error);

        Swal.fire(
            "Error",
            error.message,
            "error"
        );
    }   
}

async function cargarHistorial(){

    let res = await fetch(API + "/admin/pedidos");
    let data = await res.json();

    let tabla = document.getElementById("tablaHistorial");
    tabla.innerHTML = "";

    data.forEach(p=>{

        const productos = (p.items || []).map(item => {
            return `${item.cantidad} x ${item.nombre}`;
        }).join("<br>");

        tabla.innerHTML += `
        <tr>

            <td>${p._id}</td>
            <td>${p.usuario}</td>
            <td>${productos}</td>
            <td>$${p.total}</td>
            <td>${p.estado}</td>

            <td>
                <button class="btn btn-sm btn-warning"
                onclick="actualizarEstadoPedido('${p._id}','En preparación')">
                    En preparación
                </button>

                <button class="btn btn-sm btn-primary"
                onclick="actualizarEstadoPedido('${p._id}','En camino')">
                    En camino
                </button>

                <button class="btn btn-sm btn-success"
                onclick="actualizarEstadoPedido('${p._id}','Entregado')">
                    Entregado
                </button>

                <button class="btn btn-sm btn-danger"
                onclick="rechazarPedido('${p._id}')">
                    Rechazar
                </button>
            </td>

        </tr>
        `;
    });
}


async function actualizarEstadoPedido(id, estado){

    await fetch(API + "/admin/pedidos/" + id + "/estado", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            estado: estado
        })
    });

    cargarHistorial();
}

async function rechazarPedido(id){

    const motivo = prompt("Motivo del rechazo:");

    if(motivo === null){
        return;
    }

    await fetch(API + "/admin/pedidos/" + id + "/estado", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            estado: "Rechazado",
            motivo_rechazo: motivo || "Compra rechazada por administración"
        })
    });

    cargarHistorial();
}

/* =========================
LOGOUT
========================= */

window.logout = async function(){

    await signOut(auth);

    window.location.href =
    "login.html";
}

/* =========================
CAMBIAR PASSWORD
========================= */

window.cambiarPassword = async function(){

    try{

        const actual =
        document.getElementById("actual").value;

        const nueva =
        document.getElementById("nueva").value;

        if(nueva.length !== 8){

            Swal.fire(
                "Contraseña inválida",
                "Debe tener exactamente 8 caracteres",
                "warning"
            );

            return;
        }

        if(!/\d/.test(nueva)){

            Swal.fire(
                "Contraseña inválida",
                "Debe incluir al menos un número",
                "warning"
            );

            return;
        }

        if(!/[!@#$%^&*(),.?":{}|<>]/.test(nueva)){

            Swal.fire(
                "Contraseña inválida",
                "Debe incluir un carácter especial",
                "warning"
            );

            return;
        }

        const credential =
        EmailAuthProvider.credential(
            auth.currentUser.email,
            actual
        );

        await reauthenticateWithCredential(
            auth.currentUser,
            credential
        );

        await updatePassword(
            auth.currentUser,
            nueva
        );

        Swal.fire(
            "Éxito",
            "Contraseña actualizada",
            "success"
        );

        document.getElementById("actual").value = "";
        document.getElementById("nueva").value = "";

    }catch(error){

        console.log(error);

        if(
            error.code === "auth/wrong-password" ||
            error.code === "auth/invalid-credential"
        ){

            Swal.fire(
                "Contraseña incorrecta",
                "La contraseña actual no coincide",
                "error"
            );

            return;
        }

        Swal.fire(
            "Error",
            error.message,
            "error"
        );
    }
}

/* =========================
PEDIDOS
========================= */

async function cargarPedidos(){

    try{

        const usuario = auth.currentUser.email;

        let res = await fetch(
            API + "/pedidos/cliente/" + encodeURIComponent(usuario) + "?_=" + Date.now()
        );

        let pedidos = await res.json();

        const contenedor =
        document.getElementById("contenedor-pedidos-cliente");

        contenedor.innerHTML = "";

        if(!pedidos.length){
            contenedor.innerHTML = `
                <p class="text-gray-500 text-center">
                    Aún no tienes compras registradas.
                </p>
            `;
            return;
        }

        pedidos.forEach(pedido=>{
            contenedor.innerHTML += crearCardPedido(pedido);
        });

    }catch(error){

        console.log(error);

        Swal.fire(
            "Error",
            "No se pudieron cargar los pedidos",
            "error"
        );
    }
}

function crearCardPedido(pedido){

    const porcentaje = obtenerPorcentajeEstado(pedido.estado);

    const productos = (pedido.items || []).map(item => `
        <li class="text-sm text-gray-600">
            ${item.cantidad} x ${item.nombre} - $${item.subtotal}
        </li>
    `).join("");

    return `
    <div class="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">

        <div class="flex justify-between items-center mb-5">

            <h3 class="text-xl font-bold">
                Pedido #${pedido._id}
            </h3>

            <span class="
            ${colorEstado(pedido.estado)}
            text-white
            px-4
            py-2
            rounded-full
            text-sm
            font-bold
            ">
                ${pedido.estado}
            </span>

        </div>

        <p class="font-bold text-gray-700 mb-3">
            Total: $${pedido.total}
        </p>

        <ul class="space-y-1 mb-5">
            ${productos}
        </ul>

        <div class="mt-6">

            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                class="
                h-full
                transition-all
                duration-700
                ${pedido.estado === "Rechazado" ? "bg-red-500" : "bg-cyan-400"}
                "
                style="width:${porcentaje}%;">
                </div>
            </div>

            ${
                pedido.estado === "Rechazado"
                ? `<p class="mt-4 text-red-500 font-bold">
                    Motivo: ${pedido.motivo_rechazo || "Compra rechazada por administración"}
                   </p>`
                : ""
            }

        </div>

    </div>
    `;
}

function obtenerPorcentajeEstado(estado){

    if(estado === "En preparación"){
        return 33;
    }

    if(estado === "En camino"){
        return 66;
    }

    if(estado === "Entregado"){
        return 100;
    }

    if(estado === "Rechazado"){
        return 100;
    }

    return 0;
}

function colorEstado(estado){

    if(estado === "En preparación"){
        return "bg-yellow-400";
    }

    if(estado === "En camino"){
        return "bg-blue-500";
    }

    if(estado === "Entregado"){
        return "bg-green-500";
    }

    if(estado === "Rechazado"){
        return "bg-red-500";
    }

    return "bg-gray-400";
}

