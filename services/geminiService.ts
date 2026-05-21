
import { GoogleGenAI } from "@google/genai";
import { RequestType, Asset, RequestAsset, TransportRequest, AddressDetails } from "../types";

export const generateEmailDraft = async (
  type: RequestType,
  assets: Asset[],
  origin: string,
  destination: string,
  requestAssets?: RequestAsset[],
  totalWeight?: string,
  totalVolume?: number,
  requesterEmail?: string
): Promise<string> => {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : "Boa tarde";

  const itemsRows = assets.map(asset => {
    const details = requestAssets?.find(ra => ra.assetId === asset.id);
    const sapCode = details?.sapCode || asset.defaultSapCode || 'N/D';
    const ncm = details?.ncm || asset.defaultNcm || 'N/D';
    const nfe = details?.nfeReference || 'N/D';
    const unitVal = details?.unitValue || asset.defaultUnitValue || 0;
    const qty = details?.quantity || 1;
    const totalVal = unitVal * qty;

    return `
      <tr>
        <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${asset.name}</td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${sapCode}</td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${ncm}</td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">${nfe}</td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">R$ ${unitVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 11px;">R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 11px; text-align: center;">${qty}</td>
      </tr>
    `;
  }).join('');

  return generateSAPTemplate(greeting, origin, destination, itemsRows, totalWeight, totalVolume, requesterEmail);
};

const generateSAPTemplate = (greeting: string, origin: string, destination: string, itemsRows: string, totalWeight?: string, totalVolume?: number, requesterEmail?: string) => {
  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <p>${greeting} Tiago,</p>
      <p>Segue solicitação de NF Remessa conforme dados abaixo:</p>
      
      <table style="border: 1px solid #3b82f6; border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f0f7ff; width: 150px;">Solicitante</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${requesterEmail || 'N/D'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f0f7ff; width: 150px;">Origem</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${origin || 'Endereço não informado'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f0f7ff;">Destino</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${destination || 'Endereço não informado'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f0f7ff;">Peso Total</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${totalWeight || 'N/D'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f0f7ff;">Volume Total</td>
          <td style="padding: 10px; border: 1px solid #ddd;">${totalVolume || '1'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #f0f7ff;">Finalidade</td>
          <td style="padding: 10px; border: 1px solid #ddd;">Remessa para uso fora do estabelecimento</td>
        </tr>
      </table>

      <table style="border: 1px solid #000; border-collapse: collapse; width: 100%;">
        <thead style="background-color: #9dbadb;">
          <tr>
            <th style="border: 1px solid #000; padding: 5px; font-size: 11px;">Item</th>
            <th style="border: 1px solid #000; padding: 5px; font-size: 11px;">Cód. SAP Fiori</th>
            <th style="border: 1px solid #000; padding: 5px; font-size: 11px;">NCM</th>
            <th style="border: 1px solid #000; padding: 5px; font-size: 11px;">NFe</th>
            <th style="border: 1px solid #000; padding: 5px; font-size: 11px;">Valor Uni.</th>
            <th style="border: 1px solid #000; padding: 5px; font-size: 11px;">Valor Total</th>
            <th style="border: 1px solid #000; padding: 5px; font-size: 11px;">Qtd.</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      <p style="font-size: 10px; color: #999; margin-top: 15px;">* Documento gerado automaticamente pelo sistema.</p>
    </div>
  `;
};

export const generateLogisticsEmailDraft = async (
  request: TransportRequest,
  assets: Asset[],
  hasPremiumAccess: boolean = true
): Promise<string> => {
  const isCarrier = request.method === 'Carrier';
  const itemsList = assets.map(a => a.name).join(', ');
  
  if (!hasPremiumAccess) {
    return generateLogisticsFallback(request, itemsList, isCarrier);
  }
  
  if (isCarrier) {
    return generatePHLTemplate(request, assets);
  }

  // Fallback / AI logic for Correios
  const targetEntity = 'Correios / Equipe de Expedição';
  const actionType = 'solicitação de POSTAGEM';
  
  // Format addresses securely for the AI prompt
  const formatAddrSimple = (d: AddressDetails) => d ? `${d.city || ''} - ${d.address || ''}, CEP ${d.cep || ''}` : 'N/D';

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Atue como assistente logístico da Cirion Technologies.
      Gere um e-mail formal em HTML de ${actionType} endereçado à ${targetEntity}.

      DADOS DA SOLICITAÇÃO:
      - Protocolo: ${request.id}
      - NF Emitida: ${request.invoiceNumber || 'N/D'}
      - Local de Coleta: ${formatAddrSimple(request.originDetails)}
      - Local de Entrega: ${formatAddrSimple(request.destinationDetails)}
      - Peso: ${request.totalWeight}
      - Volumes: ${request.totalVolume}
      - Método: Correios (Sedex/PAC)
      - Itens: ${itemsList}

      TEXTO OBRIGATÓRIO DE INÍCIO:
      "Prezados,"
      "Solicitamos a postagem da encomenda conforme dados abaixo:"

      ESTRUTURA:
      1. Tabela com bordas finas contendo os detalhes acima de forma organizada.
      2. Destaque para o número da NF e locais.
      3. Inclua instrução para envio do código de rastreio após postagem.

      REGRAS:
      - O e-mail deve ser curto, objetivo e formal.
      - Informe que a NF segue em anexo.
      - Use fontes sans-serif.

      RETORNE APENAS O HTML.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    let text = response.text || "";
    text = text.replace(/```html/g, "").replace(/```/g, "").trim();
    return text || generateLogisticsFallback(request, itemsList, false);
  } catch (error) {
    console.error("Gemini Logistics Error:", error);
    return generateLogisticsFallback(request, itemsList, false);
  }
};

const generatePHLTemplate = (request: TransportRequest, assets: Asset[]) => {
  const totalValue = request.requestAssets.reduce((acc, item) => acc + (item.unitValue * item.quantity), 0);
  const origin = request.originDetails || {} as Partial<AddressDetails>;
  const destination = request.destinationDetails || {} as Partial<AddressDetails>;

  // Formatação segura de endereço com CEP
  const formatAddress = (details: any) => {
    if (!details || (!details.address && !details.city)) return "Endereço não informado";
    
    const parts = [];
    
    // Logradouro e Bairro
    let line1 = details.address || "";
    if (details.neighborhood) line1 += ` - ${details.neighborhood}`;
    if (line1) parts.push(line1);

    // Cidade e UF
    let line2 = details.city || "";
    if (details.state) line2 += ` - ${details.state}`;
    if (line2) parts.push(line2);

    // CEP
    if (details.cep) parts.push(`CEP: ${details.cep}`);

    // A/C de
    if (details.attentionTo) parts.push(`A/C de: ${details.attentionTo}`);
    
    return parts.join(', ');
  };

  const originText = formatAddress(origin);
  const destinationText = formatAddress(destination);
  const requesterContact = request.requesterEmail || "N/D";

  return `
    <div style="font-family: Arial, sans-serif; color: #000; background-color: #fff; padding: 20px;">
      
      <table style="border: 1px solid #000; border-collapse: collapse; width: 100%; max-width: 800px; font-size: 12px;">
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px; width: 25%;">SO</td>
            <td style="border: 1px solid #000; padding: 8px;">CENTRO DE CUSTO J639I016</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">NF</td>
            <td style="border: 1px solid #000; padding: 8px;">${request.invoiceNumber || 'N/D'}</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Valor: R$</td>
            <td style="border: 1px solid #000; padding: 8px;">${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Local De Coleta</td>
            <td style="border: 1px solid #000; padding: 8px;">${originText}</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Contato de Coleta</td>
            <td style="border: 1px solid #000; padding: 8px;">${origin.attentionTo ? `${origin.attentionTo} (${requesterContact})` : requesterContact}</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Tel./Cel./Ramal</td>
            <td style="border: 1px solid #000; padding: 8px;">N/D</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Local de Entrega</td>
            <td style="border: 1px solid #000; padding: 8px;">${destinationText}</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Contato de Entrega</td>
            <td style="border: 1px solid #000; padding: 8px;">${destination.attentionTo ? destination.attentionTo : 'Recebimento / Expedição'}</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Obs. de Entrega</td>
            <td style="border: 1px solid #000; padding: 8px;">Entrega das 08:30 às 17:30 em ${destination.city || 'Destino'}.</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Volume</td>
            <td style="border: 1px solid #000; padding: 8px;">${request.totalVolume || '1'}</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">Peso Total</td>
            <td style="border: 1px solid #000; padding: 8px;">${request.totalWeight || 'N/D'}</td>
         </tr>
         <tr>
            <td style="border: 1px solid #000; background-color: #ffff00; font-weight: bold; padding: 8px;">OBS</td>
            <td style="border: 1px solid #000; padding: 8px;"></td>
         </tr>
      </table>
      
      <p style="margin-top: 20px; font-size: 11px; color: #666;">* NF e documentação adicional seguem em anexo.</p>
    </div>
  `;
};

const generateLogisticsFallback = (request: TransportRequest, itemsList: string, isCarrier: boolean) => {
  const origin = request.originDetails || {} as Partial<AddressDetails>;
  const destination = request.destinationDetails || {} as Partial<AddressDetails>;

  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <p>Prezados,</p>
      <p>Solicitamos a ${isCarrier ? 'coleta' : 'postagem'} da encomenda conforme dados abaixo:</p>
      
      <table style="border: 1px solid #ccc; border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">Protocolo</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${request.id}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold; color: #059669;">NF Emitida</td>
          <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${request.invoiceNumber || 'N/D'}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">Coleta (Origem)</td>
          <td style="padding: 8px; border: 1px solid #ccc;">
             ${origin.city || ''} - ${origin.address || ''}<br>
             <span style="font-size: 11px; color: #666;">Bairro: ${origin.neighborhood || ''} | CEP: ${origin.cep || ''}</span>
             ${origin.attentionTo ? `<br><span style="font-size: 11px; color: #1e3a8a; font-weight: bold;">A/C de: ${origin.attentionTo}</span>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">Entrega (Destino)</td>
          <td style="padding: 8px; border: 1px solid #ccc;">
             ${destination.city || ''} - ${destination.address || ''}<br>
             <span style="font-size: 11px; color: #666;">Bairro: ${destination.neighborhood || ''} | CEP: ${destination.cep || ''}</span>
             ${destination.attentionTo ? `<br><span style="font-size: 11px; color: #1e3a8a; font-weight: bold;">A/C de: ${destination.attentionTo}</span>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">Detalhes</td>
          <td style="padding: 8px; border: 1px solid #ccc;">Peso: ${request.totalWeight || 'N/D'} | Vol: ${request.totalVolume || 1}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">Itens</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${itemsList}</td>
        </tr>
      </table>
      
      <p style="background-color: #fffbeb; border: 1px solid #fcd34d; padding: 10px; border-radius: 4px; font-weight: bold;">
        ${isCarrier ? '⚠️ Coleta Urgente - NF em anexo.' : 'ℹ️ Favor enviar comprovante e rastreio após postagem - NF em anexo.'}
      </p>
      
      <p style="font-size: 10px; color: #999; margin-top: 15px;">* Documento gerado automaticamente pelo sistema.</p>
    </div>
  `;
}
