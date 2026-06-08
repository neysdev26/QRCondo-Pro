// migrar.js
const { createClient } = require('@supabase/supabase-js');
const { decode } = require('base64-arraybuffer');

const supabase = createClient('https://acryossmsuyhbbgqkkon.supabase.co', 'sb_publishable_VkyMF2xCqijH5-5Tx_qeUw_Ts0WiwRm');

async function migrar() {
  const { data: registros } = await supabase
    .from('encomendas')
    .select('*')
    .like('assinatura', 'data:image%'); // Filtra o que é Base64

  console.log(`Encontrados ${registros.length} para migrar...`);

  for (const item of registros) {
    const base64Str = item.assinatura.replace(/^data:image\/\w+;base64,/, '');
    const fileName = `assinaturas/${item.id}.png`;

    const { error } = await supabase.storage
      .from('assinaturas')
      .upload(fileName, decode(base64Str), { contentType: 'image/png', upsert: true });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('assinaturas').getPublicUrl(fileName);
      await supabase.from('encomendas').update({ assinatura: publicUrl }).eq('id', item.id);
      console.log(`Item ${item.id} migrado com sucesso.`);
    }
  }
}
migrar();