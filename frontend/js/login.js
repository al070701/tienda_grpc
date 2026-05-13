import { auth } from "./firebase.js";

import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
GoogleAuthProvider,
signInWithPopup,
sendPasswordResetEmail,
sendEmailVerification,
onAuthStateChanged,
signOut
}
from
"https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

function fusionarCarritoInvitadoConUsuario(user){

    if(!user || !user.email){
        return;
    }

    const claveInvitado = "carrito_invitado";
    const claveUsuario = "carrito_" + user.email;

    const carritoInvitado =
        JSON.parse(localStorage.getItem(claveInvitado)) || [];

    const carritoUsuario =
        JSON.parse(localStorage.getItem(claveUsuario)) || [];

    if(carritoInvitado.length === 0){
        return;
    }

    carritoInvitado.forEach(productoInvitado => {

        const productoExistente = carritoUsuario.find(
            productoUsuario =>
                Number(productoUsuario.id) === Number(productoInvitado.id)
        );

        if(productoExistente){

            const cantidadNueva =
                productoExistente.cantidad + productoInvitado.cantidad;

            const stockDisponible =
                productoExistente.stock || productoInvitado.stock || cantidadNueva;

            productoExistente.cantidad = Math.min(
                cantidadNueva,
                stockDisponible
            );

        }else{

            carritoUsuario.push(productoInvitado);
        }
    });

    localStorage.setItem(
        claveUsuario,
        JSON.stringify(carritoUsuario)
    );

    localStorage.removeItem(claveInvitado);
}

/* ==============================
REGISTRAR
============================== */

window.registrar = async function(){

    const correo =
    document.getElementById("correo").value;

    const password =
    document.getElementById("password").value;

    if(password.length !== 8){

        Swal.fire(
            "Contraseña inválida",
            "La contraseña debe tener exactamente 8 caracteres",
            "warning"
        );

        return;
    }

    if(!/\d/.test(password)){

        Swal.fire(
            "Contraseña inválida",
            "La contraseña debe tener al menos un número",
            "warning"
        );

        return;
    }

    try{

        const credenciales =
        await createUserWithEmailAndPassword(
            auth,
            correo,
            password
        );

        await sendEmailVerification(
            credenciales.user
        );

        await signOut(auth);


        Swal.fire({
            icon:"info",
            title:"Verifica tu correo",
            text:"Te enviamos un enlace para activar tu cuenta antes de iniciar sesión"
        });

    }catch(error){

        Swal.fire(
            "Error",
            error.message,
            "error"
        );
    }
}

/* ==============================
LOGIN
============================== */

window.login = async function(){

    const correo =
    document.getElementById("correo").value;

    const password =
    document.getElementById("password").value;

    try{

        const credenciales =
        await signInWithEmailAndPassword(
            auth,
            correo,
            password
        );

        if(!credenciales.user.emailVerified){

            await signOut(auth);

            Swal.fire(
                "Correo no verificado",
                "Revisa tu correo y activa tu cuenta",
                "warning"
            );

            return;
        }

        // fusionarCarritoInvitadoConUsuario(
        //     credenciales.user
        // );

        Swal.fire({
            icon:"success",
            title:"Inicio de sesión exitoso",
            text:"Tu cuenta fue activada correctamente"
        }).then(()=>{
            
            const params =
            new URLSearchParams(window.location.search);
            
            const paginaVolver =
            params.get("volver") || "tienda.html";
            window.location.href = paginaVolver;
        });

    }catch(error){

        if(error.code === "auth/user-not-found"){

            Swal.fire(
                "Correo no existente",
                "No existe una cuenta con ese correo",
                "warning"
            );

            return;
        }

        if(error.code === "auth/wrong-password"){

            Swal.fire(
                "Contraseña incorrecta",
                "La contraseña ingresada no es válida",
                "warning"
            );

            return;
        }

        if(error.code === "auth/invalid-credential"){

            Swal.fire(
                "Datos inválidos",
                "Correo o contraseña incorrectos",
                "warning"
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

/* ==============================
GOOGLE LOGIN
============================== */

window.loginGoogle = async function(){

    try{

        const provider =
        new GoogleAuthProvider();

        const result =
        await signInWithPopup(
            auth,
            provider
        );

        // // fusionarCarritoInvitadoConUsuario(result.user);

        window.location.href =
        "tienda.html";

    }catch(error){

        Swal.fire(
            "Error",
            error.message,
            "error"
        );
    }
}

/* ==============================
RECUPERAR PASSWORD
============================== */

window.recuperarPassword = async function(){

    const correo =
    document.getElementById("correo").value;

    if(!correo){

        Swal.fire(
            "Error",
            "Escribe tu correo",
            "warning"
        );

        return;
    }

    try{

        await sendPasswordResetEmail(
            auth,
            correo
        );

        Swal.fire(
            "Correo enviado",
            "Revisa tu bandeja de entrada",
            "success"
        );

    }catch(error){

        Swal.fire(
            "Error",
            error.message,
            "error"
        );
    }
}

window.volverAnterior = function(){

    const params =
        new URLSearchParams(window.location.search);

    const paginaVolver =
        params.get("volver");

    if(paginaVolver){
        window.location.href = paginaVolver;
    }else{
        window.location.href = "index.html";
    }
}
