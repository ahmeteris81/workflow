const axios = require('axios');
const Airtable = require('airtable');
const xml2js = require('xml2js');

// Airtable configuration
const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY})
            .base(process.env.AIRTABLE_BASE_ID);

// SOAP request configuration
const SOAP_URL = 'https://www.nemodabutik.com/Servis/UrunServis.svc?wsdl';
const SOAP_BODY = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:ns="http://schemas.datacontract.org/2004/07/">
   <soapenv:Header/>
   <soapenv:Body>
      <tem:SelectUrun>
         <tem:UyeKodu>X0RIYB6FC9SOT8TH9YWT7TGL6JMLU4</tem:UyeKodu>
         <tem:f>
            <ns:Aktif>-1</ns:Aktif>
         </tem:f>
         <tem:s>
            <ns:BaslangicIndex>0</ns:BaslangicIndex>
            <ns:KayitSayisi>200</ns:KayitSayisi>
         </tem:s>
      </tem:SelectUrun>
   </soapenv:Body>
</soapenv:Envelope>`;

async function syncProducts() {
    try {
        // Ticimax'den veri çek
        const response = await axios.post(SOAP_URL, SOAP_BODY, {
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                'SOAPAction': 'http://tempuri.org/SelectUrun'
            }
        });

        // XML'i parse et
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);

        // Ürün listesini al
        const products = result.Envelope.Body[0].SelectUrunResponse[0].SelectUrunResult[0].UrunKarti;

        // Her ürün için Airtable'a kayıt ekle
        for (const product of products) {
            await base('Ürün Listesi').create({
                "Ürün KartID": product.ID[0],
                "Ürün Adı": product.UrunAdi[0],
                "Fiyatı": product.Varyasyonlar[0].SatisFiyati[0],
                "URL": product.URL[0]
            });
        }

        console.log('Sync completed successfully!');
    } catch (error) {
        console.error('Error during sync:', error);
        process.exit(1);
    }
}

syncProducts();
