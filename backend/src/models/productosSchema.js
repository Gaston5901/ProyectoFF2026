import { Schema, model } from "mongoose";

const productosSchema = new Schema({
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  descripcion: { type: String, required: true },
  imagen: { type: String, required: true },
});  


const ProductosModel = model("productos", productosSchema);
export default ProductosModel;
