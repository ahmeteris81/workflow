const axios = require('axios');
const Airtable = require('airtable');
const xml2js = require('xml2js');

// Airtable configuration
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);

// SOAP request configuration
const SOAP_URL = 'https://www.nemodabutik.com/Servis/UrunServis.svc?wsdl';
const SOAP_BODY = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:ns="http://schemas.datacontract.org/2004/07/" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:SelectUrun>
         <tem:UyeKodu>X0RIYB6FC9SOT8TH9YWT7TGL6JMLU4</tem:UyeKodu>
         <tem:f>
            <ns:Aktif>-1</ns:Aktif>
            <ns:EntegrasyonDegerTanim></ns:EntegrasyonDegerTanim>
            <ns:EntegrasyonKodu></ns:EntegrasyonKodu>
         </tem:f>
         <tem:s>
            <ns:BaslangicIndex>0</ns:BaslangicIndex>
            <ns:KayitSayisi>3</ns:KayitSayisi>
            <ns:SiralamaDegeri>id</ns:SiralamaDegeri>
            <ns:SiralamaYonu>Desc</ns:SiralamaYonu>
         </tem:s>
      </tem:SelectUrun>
   </soapenv:Body>
</soapenv:Envelope>`;

async function syncProducts() {
    try {
        // Ticimax'den veri çek
        const response = await axios.post(SOAP_URL, SOAP_BODY, {
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://tempuri.org/IUrunServis/SelectUrun'
            }
        });

        // XML'i parse et
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);

        // Debug için response'u logla
        console.log('API Response:', JSON.stringify(result, null, 2));

        // Ürün listesini al
        const products = result['s:Envelope']?.['s:Body']?.SelectUrunResponse?.SelectUrunResult?.a_UrunKarti;

        // products'ın bir dizi olup olmadığını kontrol et
        if (!Array.isArray(products)) {
            console.error('Ürünler bir dizi değil veya boş:', products);
            return;
        }

        // Her ürün için Airtable'a kayıt ekle
        for (const product of products) {
            try {
                await base('Ürün Listesi').create({
                    "Ürün KartID": product.a_ID,
                    "Ürün Adı": product.a_UrunAdi,
                    "Fiyatı": product.a_Varyasyonlar?.a_Varyasyon?.a_SatisFiyati || "",
                    "URL": product.a_UrunSayfaAdresi || ""
                });
                console.log(`Ürün eklendi: ${product.a_UrunAdi}`);
            } catch (err) {
                console.error(`Ürün eklenirken hata: ${err.message}`);
            }
        }

        console.log('Senkronizasyon tamamlandı!');
    } catch (error) {
        console.error('Senkronizasyon hatası:', error.response?.data || error.message);
        process.exit(1);
    }
}

syncProducts();
