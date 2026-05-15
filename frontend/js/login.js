import { auth } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification,
    signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";


/* ==============================
    UTILIDADES
============================== */

function obtenerCorreo(){
    return document.getElementById("correo").value.trim();
}

function obtenerPassword(){
    return document.getElementById("password").value;
}

function mostrarAlerta(titulo, mensaje, icono = "warning"){
    Swal.fire(
        titulo,
        mensaje,
        icono
    );
}

function redirigirDespuesDeLogin(){
    const params = new URLSearchParams(window.location.search);
    const paginaVolver = params.get("volver") || "tienda.html";

    window.location.href = paginaVolver;
}

function validarCorreo(correo){

    if(!correo){
        mostrarAlerta(
            "Correo vacío",
            "Escribe tu correo electrónico antes de continuar."
        );

        return false;
    }

    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!formatoCorreo.test(correo)){
        mostrarAlerta(
            "Correo inválido",
            "Escribe un correo válido. Ejemplo: ejemplo@correo.com"
        );

        return false;
    }

    return true;
}

function validarPasswordRegistro(password){

    if(!password){
        mostrarAlerta(
            "Contraseña vacía",
            "Escribe una contraseña antes de crear tu cuenta."
        );

        return false;
    }

    if(password.length < 8){
        mostrarAlerta(
            "Contraseña muy corta",
            "La contraseña debe tener mínimo 8 caracteres."
        );

        return false;
    }

    if(!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password)){
        mostrarAlerta(
            "Contraseña sin letra",
            "La contraseña debe tener al menos una letra."
        );

        return false;
    }

    if(!/\d/.test(password)){
        mostrarAlerta(
            "Contraseña sin número",
            "La contraseña debe tener al menos un número."
        );

        return false;
    }

    return true;
}

function validarPasswordLogin(password){

    if(!password){
        mostrarAlerta(
            "Contraseña vacía",
            "Escribe tu contraseña para iniciar sesión."
        );

        return false;
    }

    return true;
}

function manejarErrorFirebase(error, contexto = "general"){

    console.log("ERROR FIREBASE:", error.code, error.message);

    if(error.code === "auth/invalid-email"){
        mostrarAlerta(
            "Correo inválido",
            "El formato del correo no es correcto. Revisa que esté bien escrito."
        );
        return;
    }

    if(error.code === "auth/email-already-in-use"){
        mostrarAlerta(
            "Correo ya registrado",
            "Ya existe una cuenta con ese correo. Intenta iniciar sesión."
        );
        return;
    }

    if(error.code === "auth/weak-password"){
        mostrarAlerta(
            "Contraseña débil",
            "La contraseña es muy débil. Usa mínimo 8 caracteres, letras y números."
        );
        return;
    }

    if(error.code === "auth/user-not-found"){
        mostrarAlerta(
            "Cuenta no encontrada",
            "No existe una cuenta registrada con ese correo."
        );
        return;
    }

    if(error.code === "auth/wrong-password"){
        mostrarAlerta(
            "Contraseña incorrecta",
            "La contraseña que escribiste no coincide con esa cuenta."
        );
        return;
    }

    if(error.code === "auth/invalid-credential"){
        mostrarAlerta(
            "Datos incorrectos",
            "El correo o la contraseña son incorrectos. Revisa tus datos e intenta de nuevo."
        );
        return;
    }

    if(error.code === "auth/missing-password"){
        mostrarAlerta(
            "Contraseña vacía",
            "Escribe tu contraseña antes de continuar."
        );
        return;
    }

    if(error.code === "auth/too-many-requests"){
        mostrarAlerta(
            "Demasiados intentos",
            "Firebase bloqueó temporalmente el acceso por demasiados intentos fallidos. Espera unos minutos e intenta de nuevo."
        );
        return;
    }

    if(error.code === "auth/popup-closed-by-user"){
        mostrarAlerta(
            "Inicio cancelado",
            "Cerraste la ventana de Google antes de completar el inicio de sesión."
        );
        return;
    }

    if(error.code === "auth/cancelled-popup-request"){
        mostrarAlerta(
            "Ventana cancelada",
            "Se abrió otra ventana de inicio de sesión. Intenta de nuevo."
        );
        return;
    }

    if(error.code === "auth/popup-blocked"){
        mostrarAlerta(
            "Ventana bloqueada",
            "El navegador bloqueó la ventana de Google. Permite ventanas emergentes para esta página."
        );
        return;
    }

    if(error.code === "auth/unauthorized-domain"){
        mostrarAlerta(
            "Dominio no autorizado",
            "Firebase no permite iniciar sesión desde esta dirección. Agrega tu localhost o IP de Radmin en Firebase Authentication > Settings > Authorized domains."
        );
        return;
    }

    if(error.code === "auth/network-request-failed"){
        mostrarAlerta(
            "Error de conexión",
            "No se pudo conectar con Firebase. Revisa tu internet o si estás usando una IP/local diferente."
        );
        return;
    }

    if(contexto === "recuperar"){
        mostrarAlerta(
            "No se pudo enviar el correo",
            "Revisa que el correo esté bien escrito o que exista una cuenta con ese correo.",
            "error"
        );
        return;
    }

    mostrarAlerta(
        "Error inesperado",
        "Ocurrió un error no identificado: " + error.message,
        "error"
    );
}


/* ==============================
    REGISTRAR
============================== */

window.registrar = async function(){

    const correo = obtenerCorreo();
    const password = obtenerPassword();

    if(!validarCorreo(correo)){
        return;
    }

    if(!validarPasswordRegistro(password)){
        return;
    }

    try{

        const credenciales = await createUserWithEmailAndPassword(
            auth,
            correo,
            password
        );

        await sendEmailVerification(
            credenciales.user
        );

        await signOut(auth);

        Swal.fire({
            icon: "info",
            title: "Verifica tu correo",
            text: "Te enviamos un enlace para activar tu cuenta. Debes verificar tu correo antes de iniciar sesión."
        });

    }catch(error){
        manejarErrorFirebase(error, "registro");
    }
};


/* ==============================
    LOGIN
============================== */

window.login = async function(){

    const correo = obtenerCorreo();
    const password = obtenerPassword();

    if(!validarCorreo(correo)){
        return;
    }

    if(!validarPasswordLogin(password)){
        return;
    }

    try{

        const credenciales = await signInWithEmailAndPassword(
            auth,
            correo,
            password
        );

        if(!credenciales.user.emailVerified){

            await signOut(auth);

            Swal.fire(
                "Correo no verificado",
                "Revisa tu correo y activa tu cuenta antes de iniciar sesión.",
                "warning"
            );

            return;
        }

        Swal.fire({
            icon: "success",
            title: "Inicio de sesión exitoso",
            text: "Bienvenido a Rellenitos."
        }).then(() => {
            redirigirDespuesDeLogin();
        });

    }catch(error){
        manejarErrorFirebase(error, "login");
    }
};


/* ==============================
    GOOGLE LOGIN
============================== */

window.loginGoogle = async function(){

    try{

        const provider = new GoogleAuthProvider();

        await signInWithPopup(
            auth,
            provider
        );

        Swal.fire({
            icon: "success",
            title: "Inicio con Google exitoso",
            text: "Bienvenido a Rellenitos."
        }).then(() => {
            redirigirDespuesDeLogin();
        });

    }catch(error){
        manejarErrorFirebase(error, "google");
    }
};


/* ==============================
    RECUPERAR CONTRASEÑA
============================== */

window.recuperarPassword = async function(){

    const correo = obtenerCorreo();

    if(!validarCorreo(correo)){
        return;
    }

    try{

        await sendPasswordResetEmail(
            auth,
            correo
        );

        Swal.fire(
            "Correo enviado",
            "Revisa tu bandeja de entrada para restablecer tu contraseña.",
            "success"
        );

    }catch(error){
        manejarErrorFirebase(error, "recuperar");
    }
};


/* ==============================
    VOLVER
============================== */

window.volverAnterior = function(){

    const params = new URLSearchParams(window.location.search);
    const paginaVolver = params.get("volver");

    if(paginaVolver){
        window.location.href = paginaVolver;
    }else{
        window.location.href = "index.html";
    }
};