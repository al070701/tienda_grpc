from basedatos.db import productos_collection
from datetime import datetime

productos = [

    {
        "_id": 1,
        "nombre": "Vainilla",
        "precio": 50,
        "stock": 10,
        "imagen": "vainillasencilla.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de vainilla, con un sabor suave y cremoso que te transportará a la infancia.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 2,
        "nombre": "Fresa",
        "precio": 50,
        "stock": 8,
        "imagen": "fresasencilla.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de fresa, con un sabor dulce y afrutado que te hará sonreír con cada bocado.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 3,
        "nombre": "Taro",
        "precio": 50,
        "stock": 8,
        "imagen": "taro.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de taro, con un sabor único y exótico que te sorprenderá con su dulzura y textura suave.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 4,
        "nombre": "Chocolate blanco con chispas",
        "precio": 55,
        "stock": 8,
        "imagen": "chocoblanco.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de chocolate blanco con chispas, con un sabor dulce y cremoso que te hará derretir de placer.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 5,
        "nombre": "Matcha con chispas",
        "precio": 55,
        "stock": 8,
        "imagen": "matchasencilla.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de matcha con chispas, con un sabor terroso y dulce que te transportará a los jardines japoneses.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 6,
        "nombre": " Miel",
        "precio": 55,
        "stock": 8,
        "imagen": "miel.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de miel, con un sabor dulce y floral que te hará sentir como si estuvieras en un campo de flores.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 7,
        "nombre": "Chocolate amargo",
        "precio": 60,
        "stock": 8,
        "imagen": "tchocolate.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de chocolate amargo, con un sabor intenso y cremoso que te hará disfrutar de cada bocado.",           
        "fecha_creacion": datetime.now()
    },

        {
        "_id": 8,
        "nombre": "Cajeta",
        "precio": 55,
        "stock": 8,
        "imagen": "tchocolate.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de cajeta, con un sabor dulce y cremoso que te hará sentir como si estuvieras en un campo de flores.",
        "fecha_creacion": datetime.now()
    },

        {
        "_id": 9,
        "nombre": "Vainilla especial",
        "precio": 60,
        "stock": 8,
        "imagen": "tchocolate.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de vainilla especial, con un sabor suave y cremoso que te transportará a la infancia.",       
        "fecha_creacion": datetime.now()
    },

        {
        "_id": 10,
        "nombre": "Fresa especial",
        "precio": 60,
        "stock": 8,
        "imagen": "tchocolate.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de fresa especial, con un sabor dulce y afrutado que te hará sonreír con cada bocado.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 11,
        "nombre": "Piña",
        "precio": 50,
        "stock": 8,
        "imagen": "piña.png",
        "categoria": "taiyakis", 
        "descripcion": "Delicioso taiyaki de piña, con un sabor dulce y tropical que te hará sentir como si estuvieras en una playa paradisíaca.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 12,
        "nombre": "Frambuesa",
        "precio": 55,
        "stock": 8,
        "imagen": "frambuesa.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de frambuesa, con un sabor dulce y ligeramente ácido que te hará disfrutar de cada bocado.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 13,
        "nombre": "Matcha especial",
        "precio": 60,
        "stock": 8,
        "imagen": "matcha.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de matcha especial, con un sabor terroso y dulce que te transportará a los jardines japoneses.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 14,
        "nombre": "Oreo",
        "precio": 55,
        "stock": 8,
        "imagen": "toreo.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de Oreo, con un sabor dulce y cremoso que te hará sentir como si estuvieras disfrutando de una galleta Oreo en cada bocado.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 15,
        "nombre": "Dubai",
        "precio": 55,
        "stock": 8,
        "imagen": "dubai.png",
        "categoria": "taiyakis",
        "descripcion": "Delicioso taiyaki de Dubai, con un sabor único y exótico que te sorprenderá con su dulzura y textura suave.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 16,
        "nombre": "Pandita",
        "precio": 50,
        "stock": 20,
        "imagen": "gomapanda.png",
        "categoria": "gomitas",
        "descripcion": "Deliciosa gomita de panda, con un sabor dulce y cremoso que te hará sentir como si estuvieras en un bosque de bambú.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 17,
        "nombre": "Uva",
        "precio": 50,
        "stock": 20,
        "imagen": "gomauva.png",
        "categoria": "gomitas",
        "descripcion": "Deliciosa gomita de uva, con un sabor dulce y afrutado que te hará disfrutar de cada bocado.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 18,
        "nombre": "Cereza",
        "precio": 50,
        "stock": 20,
        "imagen": "gomacereza.png",
        "categoria": "gomitas",
        "descripcion": "Deliciosa gomita de cereza, con un sabor dulce y afrutado que te hará disfrutar de cada bocado.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 19,
        "nombre": "Uva morada",
        "precio": 50,
        "stock": 20,
        "imagen": "gomauva_morada.png",
        "categoria": "gomitas",
        "descripcion": "Deliciosa gomita de uva morada, con un sabor dulce y afrutado que te hará disfrutar de cada bocado.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 20,
        "nombre": "Vainillachoco",
        "precio": 50,
        "stock": 20,
        "imagen": "gomavainilla.png",
        "categoria": "gomitas",
        "descripcion": "Deliciosa gomita de vainilla con chocolate, con un sabor dulce y cremoso que te hará sentir como si estuvieras en un jardín de flores.",
        "fecha_creacion": datetime.now()
    },

    {
        "_id": 21,
        "nombre": "Flan",
        "precio": 50,
        "stock": 20,
        "imagen": "gomapurin.png",
        "categoria": "gomitas",
        "descripcion": "Deliciosa gomita de flan, con un sabor dulce y cremoso que te hará sentir como si estuvieras disfrutando de un postre de flan en cada bocado.",
        "fecha_creacion": datetime.now()
    }

]

# productos_collection.insert_many(productos)

for producto in productos:

    productos_collection.update_one(

        {"_id": producto["_id"]},

        {"$set": producto},

        upsert=True

    )

print("Productos sincronizados")
print("Descripciones actualizadas")

#print("Productos insertados")