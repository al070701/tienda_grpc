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

const API = "http://26.145.132.10:8000";

/* =========================
PROTEGER PERFIL
========================= */

onAuthStateChanged(auth,(user)=>{

    if(!user){
        window.location.href = "login.html";
        return;
    }

    cargarDatos(user);
    cargarPedidos();
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

    document
    .getElementById(id)
    .classList.remove("hidden");
}

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

        const usuario =
        auth.currentUser.email;

        let res =
        await fetch(API + "/historial/" + usuario);

        let data =
        await res.json();

        const contenedor =
        document.getElementById("lista-pedidos");

        contenedor.innerHTML = "";

        function colorEstado(estado){

            if(estado === "preparando"){
                return "bg-yellow-400";
            }

            if(estado === "camino"){
                return "bg-blue-500";
            }

            if(estado === "entregado"){
                return "bg-green-500";
            }

            return "bg-gray-400";
        }

        function textoEstado(estado){

            if(estado === "preparando"){
                return "Preparando";
            }

            if(estado === "camino"){
                return "En camino";
            }

            if(estado === "entregado"){
                return "Entregado";
            }

            return "Desconocido";
        }

        function crearCard(p){

            return `
            <div class="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">

                <div class="flex justify-between items-center mb-5">

                    <h3 class="text-xl font-bold">
                        Pedido #${p.id || ""}
                    </h3>

                    <span class="
                    ${colorEstado(p.estado)}
                    text-white
                    px-4
                    py-2
                    rounded-full
                    text-sm
                    font-bold
                    ">
                        ${textoEstado(p.estado)}
                    </span>

                </div>

                <div class="space-y-2 text-gray-600">

                    <p>
                        <b>Producto:</b>
                        ${p.producto || "Producto"}
                    </p>

                    <p>
                        <b>Cantidad:</b>
                        ${p.cantidad}
                    </p>

                    <p>
                        <b>Fecha:</b>
                        ${p.fecha}
                    </p>

                </div>

                <!-- BARRA VISUAL -->

                <div class="mt-6">

                    <div class="flex justify-between text-sm mb-2">

                        <span>Preparando</span>
                        <span>En camino</span>
                        <span>Entregado</span>

                    </div>

                    <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">

                        <div
                        class="
                        h-full
                        transition-all
                        duration-500

                        ${
                            p.estado === "preparando"
                            ? "w-1/3 bg-yellow-400"
                            : p.estado === "camino"
                            ? "w-2/3 bg-blue-500"
                            : "w-full bg-green-500"
                        }
                        ">
                        </div>

                    </div>

                </div>

            </div>
            `;
        }

        window.volverInicio = function(){
            window.location.href = "index.html";
        }

        const pedidos = [

            ...(data.preparando || []),
            ...(data.camino || []),
            ...(data.entregados || [])

        ];

        pedidos.forEach(p=>{

            contenedor.innerHTML +=
            crearCard(p);
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