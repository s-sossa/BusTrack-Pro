import React, { useEffect } from 'react';
import { supabase } from './supabase.js';

export function App() {
  useEffect(() => {
    async function probarConexion() {
      const { data, error } = await supabase.from('buses').select('*');

      if (error) {
        console.error('Error conectando a Supabase ❌:', error.message);
      } else {
        console.log('¡Conexión exitosa! ✅ Datos de los buses:', data);
      }
    }

    probarConexion();
  }, []);

  console.log("El componente App se está renderizando");

  return (
    <div className="app-container">
      <h1>BusTrack Pro Dashboard</h1>
    </div>
  );
}

export default App;
