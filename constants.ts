
import { Asset, AssetType, TransportRequest, RequestType, RequestStatus, AddressDetails, LogisticsStatus } from './types';

export const MOCKED_ADDRESSES: Record<string, AddressDetails> = {
  '06708-070': {
    cep: '06708-070',
    bp: '2000017371',
    state: 'SP',
    plant: '980H',
    city: 'Cotia',
    neighborhood: 'Pq. Sao George',
    address: 'Rua Eid Mansur 666 Andar 1'
  },
  '51110-160': {
    cep: '51110-160',
    bp: '2000017375',
    state: 'PE',
    plant: '978H',
    city: 'Recife',
    neighborhood: 'Pina',
    address: 'Av. Republica 251 Sala 819 T'
  },
  '20941-070': {
    cep: '20941-070',
    bp: '2000013230',
    state: 'RJ',
    plant: '980M',
    city: 'Rio de Janeiro',
    neighborhood: 'São Cristóvão',
    address: 'Av. Pedro II, 329'
  },
  '13092-110': {
    cep: '13092-110',
    bp: '2000013218',
    state: 'SP',
    plant: '978F',
    city: 'Campinas',
    neighborhood: 'Nova Campinas',
    address: 'Rua Odila Maia Rocha Brito 527 Conj. 73'
  },
  '04547-130': {
    cep: '04547-130',
    bp: '2000018225',
    state: 'SP',
    plant: '978G',
    city: 'São Paulo',
    neighborhood: 'Vila Olimpia',
    address: 'Alameda Vicente Pinzon 51 Andar 4'
  },
  '70041-902': {
    cep: '70041-902',
    bp: '2000014749',
    state: 'DF',
    plant: '980O',
    city: 'Brasília',
    neighborhood: 'Asa Norte',
    address: 'ST SBN Quadra 1 Bloco B Salas 303 e 304 Edif. Confe'
  },
  '81270-050': {
    cep: '81270-050',
    bp: '2000014760',
    state: 'PR',
    plant: '980P',
    city: 'Curitiba',
    neighborhood: 'Cidade Industrial',
    address: 'R. do Semeador 354'
  },
  '90480-003': {
    cep: '90480-003',
    bp: '2000014761',
    state: 'RS',
    plant: '980I',
    city: 'Porto Alegre',
    neighborhood: 'Auxiliadora',
    address: 'Av. Carlos Gomes 141 Conj. 902'
  },
  '11705-045': {
    cep: '11705-045',
    bp: '2000017374',
    state: 'SP',
    plant: '980K',
    city: 'Praia Grande',
    neighborhood: 'Mirim',
    address: 'Rua Moises Cardoso de Oliveira 100'
  },
  '60181-770': {
    cep: '60181-770',
    bp: '2000013235',
    state: 'CE',
    plant: '980J',
    city: 'Fortaleza',
    neighborhood: 'Praia do Futuro',
    address: 'Av. Dioguinho 2950'
  },
  '41820-790': {
    cep: '41820-790',
    bp: '2000017373',
    state: 'BA',
    plant: '980Q',
    city: 'Salvador',
    neighborhood: 'Caminho das Arvores',
    address: 'Al Salvador 1057 Edif. Salva'
  },
  '89218-105': {
    cep: '89218-105',
    bp: '2000026366',
    state: 'SC',
    plant: '978I',
    city: 'Joinville',
    neighborhood: 'Santo Antonio',
    address: 'Av. Santo Dumont 935'
  },
  '30140-003': {
    cep: '30140-003',
    bp: '2000012167',
    state: 'MG',
    plant: '980L',
    city: 'Belo Horizonte',
    neighborhood: 'Funcionários',
    address: 'Av. Brasil 1438 Salas 601'
  },
  '74180-040': {
    cep: '74180-040',
    bp: '2000017391',
    state: 'GO',
    plant: '984G',
    city: 'Goiania',
    neighborhood: 'Setor Marista',
    address: 'Av. 136 QD. F47 LT. 19/23 Ed. Executive tower 960 Sala 805'
  },
  '86080-080': {
    cep: '86080-080',
    bp: '2000026370',
    state: 'PR',
    plant: '978E',
    city: 'Londrina',
    neighborhood: 'Centro',
    address: 'Av. Higienopolis 210 - 7° Andar S.A'
  }
};

export const INITIAL_ASSETS: Asset[] = [
  { id: '1', tag: 'CR-001', name: 'Base Cooler Warrior', type: AssetType.OTHER, serialNumber: 'SN-WARR-01', defaultSapCode: '5000009', defaultNcm: '0', defaultUnitValue: 1400.00, defaultNfeReference: 'Sem nota de Origem 16' },
  { id: '2', tag: 'CB-001', name: 'Cabo HDMI p/ VGA Generic', type: AssetType.OTHER, serialNumber: 'SN-HDMI-02', defaultSapCode: '5000415', defaultNcm: '8544.20.00', defaultUnitValue: 58.00, defaultNfeReference: 'Sem nota de Origem 18' },
  { id: '3', tag: 'CAM-01', name: 'Câmera 360º modelo CX5000', type: AssetType.OTHER, serialNumber: 'SN-CAM-03', defaultSapCode: '5000011', defaultNcm: '0', defaultUnitValue: 5000.00, defaultNfeReference: 'Sem nota de Origem 13' },
  { id: '4', tag: 'SUP-01', name: 'CRADLES Suporte P/ Nootebook', type: AssetType.OTHER, serialNumber: 'SN-SUP-04', defaultSapCode: '5000013', defaultNcm: '8414.59.90', defaultUnitValue: 100.00, defaultNfeReference: 'Sem nota de Origem 17' },
  { id: '5', tag: 'DK-001', name: 'Desktop TC M70q ( Gabinetes )', type: AssetType.PC, serialNumber: 'SN-M70-05', defaultSapCode: '5000005', defaultNcm: '8471.50.10', defaultUnitValue: 3882.51, defaultNfeReference: 'NF 272071' },
  { id: '6', tag: 'DK-002', name: 'Desktop TC M80q ( Gabinetes )', type: AssetType.PC, serialNumber: 'SN-M80-06', defaultSapCode: '5000005', defaultNcm: '8471.30.10', defaultUnitValue: 7851.53, defaultNfeReference: 'NF 297067 - M80Q' },
  { id: '7', tag: 'DS-001', name: 'Dockstation THINKPAD USB-C', type: AssetType.OTHER, serialNumber: 'SN-DS-07', defaultSapCode: '5000013', defaultNcm: '8471.80.00', defaultUnitValue: 983.58, defaultNfeReference: 'NF 271541' },
  { id: '8', tag: 'HS-001', name: 'Headset', type: AssetType.OTHER, serialNumber: 'SN-HS-08', defaultSapCode: '5000392', defaultNcm: '8518.30.00', defaultUnitValue: 299.90, defaultNfeReference: 'NF 246654 - H' },
  { id: '9', tag: 'IPH-12', name: 'IPHONE 12 256 GB', type: AssetType.OTHER, serialNumber: 'SN-IPH12-09', defaultSapCode: '5000396', defaultNcm: '8517.12.31', defaultUnitValue: 9236.00, defaultNfeReference: 'Sem nota de Origem 8' },
  { id: '10', tag: 'IPH-14', name: 'IPHONE 14', type: AssetType.OTHER, serialNumber: 'SN-IPH14-10', defaultSapCode: '5000000', defaultNcm: '8517.12.31', defaultUnitValue: 3500.00, defaultNfeReference: 'Sem nota de Origem 9' },
  { id: '11', tag: 'KB-001', name: 'KEYBOARD Teclado de Computador', type: AssetType.OTHER, serialNumber: 'SN-KB-11', defaultSapCode: '5000396', defaultNcm: '8471.60.52', defaultUnitValue: 55.00, defaultNfeReference: 'NF 272071' },
  { id: '12', tag: 'BP-001', name: 'Mochila P/ Noteboock', type: AssetType.OTHER, serialNumber: 'SN-BP-12', defaultSapCode: '5000565', defaultNcm: '4202.12.20', defaultUnitValue: 114.77, defaultNfeReference: 'NF 1459396' },
  { id: '13', tag: 'MON-01', name: 'Monitor', type: AssetType.OTHER, serialNumber: 'SN-MON-13', defaultSapCode: '5000006', defaultNcm: '8528.52.20', defaultUnitValue: 1169.15, defaultNfeReference: 'NF 3525083' },
  { id: '14', tag: 'MS-001', name: 'Mouse', type: AssetType.OTHER, serialNumber: 'SN-MS-14', defaultSapCode: '5000393', defaultNcm: '8471.60.53', defaultUnitValue: 68.90, defaultNfeReference: 'NF 272071' },
  { id: '15', tag: 'NB-GEN', name: 'Notebook Generic Brasil MPN 118', type: AssetType.NOTEBOOK, serialNumber: 'SN-NB-15', defaultSapCode: '5000007', defaultNcm: '8471.30.12', defaultUnitValue: 3500.00, defaultNfeReference: 'Sem Nota de Origem' },
  { id: '16', tag: 'NB-E490', name: 'Notebook Lenovo E490', type: AssetType.NOTEBOOK, serialNumber: 'SN-NB-16', defaultSapCode: '5000007', defaultNcm: '8471.30.12', defaultUnitValue: 4370.00, defaultNfeReference: 'NF 141338 - E490' },
  { id: '17', tag: 'NB-T14', name: 'Notebook T14', type: AssetType.NOTEBOOK, serialNumber: 'SN-NB-17', defaultSapCode: '5000007', defaultNcm: '8471.30.12', defaultUnitValue: 6125.12, defaultNfeReference: 'NF 297067 - T14' },
  { id: '18', tag: 'NB-E14', name: 'Notebook THINKPAD E14', type: AssetType.NOTEBOOK, serialNumber: 'SN-NB-18', defaultSapCode: '5000007', defaultNcm: '8471.30.12', defaultUnitValue: 4917.98, defaultNfeReference: 'NF 272071 - E14' },
  { id: '19', tag: 'NB-E480', name: 'Notebook THINKPAD E480', type: AssetType.NOTEBOOK, serialNumber: 'SN-NB-19', defaultSapCode: '5000007', defaultNcm: '8471.30.12', defaultUnitValue: 3661.31, defaultNfeReference: 'NF 81502 - E480' },
  { id: '20', tag: 'NB-T480', name: 'Notebook THINKPAD T480', type: AssetType.NOTEBOOK, serialNumber: 'SN-NB-20', defaultSapCode: '5000007', defaultNcm: '8471.30.12', defaultUnitValue: 4525.31, defaultNfeReference: 'NF 81502 - T480' },
  { id: '21', tag: 'NB-X13', name: 'Notebook THINKPAD X13', type: AssetType.NOTEBOOK, serialNumber: 'SN-NB-21', defaultSapCode: '5000007', defaultNcm: '8471.30.12', defaultUnitValue: 9354.51, defaultNfeReference: 'NF 297067 - X3' },
  { id: '22', tag: 'CEL-01', name: 'Motorola Moto G54 256GB', type: AssetType.OTHER, serialNumber: 'SN-MOT-22', defaultSapCode: '5000000', defaultNcm: '8517.12.31', defaultUnitValue: 1779.00, defaultNfeReference: 'NF 21451083' },
  { id: '23', tag: 'CEL-02', name: 'Samsung A12', type: AssetType.OTHER, serialNumber: 'SN-SAM-23', defaultSapCode: '5000000', defaultNcm: '8517.12.31', defaultUnitValue: 1404.00, defaultNfeReference: 'NF 17678307' },
  { id: '24', tag: 'SP-001', name: 'Speaker Lenovo', type: AssetType.OTHER, serialNumber: 'SN-SP-24', defaultSapCode: '5000395', defaultNcm: '8518.21.00', defaultUnitValue: 844.89, defaultNfeReference: 'NF 308420 - S' },
  { id: '25', tag: 'SSD-01', name: 'SSD Kingston', type: AssetType.OTHER, serialNumber: 'SN-SSD-25', defaultSapCode: '5000595', defaultNcm: '8523.51.90', defaultUnitValue: 330.00, defaultNfeReference: 'NF 27' },
  { id: '26', tag: 'SW-001', name: 'Switch JUNIPER EX4200-24P', type: AssetType.SWITCH, serialNumber: 'SN-SW-26', defaultSapCode: '1338502', defaultNcm: '8471.60.52', defaultUnitValue: 10000.00, defaultNfeReference: 'Sem nota de Origem 12' },
  { id: '27', tag: 'SW-002', name: 'Switch JUNIPER EX4300-24P', type: AssetType.SWITCH, serialNumber: 'SN-SW-27', defaultSapCode: '1338502', defaultNcm: '8471.60.52', defaultUnitValue: 10000.00, defaultNfeReference: 'Sem nota de Origem 10' },
  { id: '28', tag: 'SW-003', name: 'Switch JUNIPER EX4300-48P', type: AssetType.SWITCH, serialNumber: 'SN-SW-28', defaultSapCode: '1338502', defaultNcm: '8471.60.52', defaultUnitValue: 20000.00, defaultNfeReference: 'Sem nota de Origem 11' },
  { id: '29', tag: 'TEL-01', name: 'Telefone IP POLYCOM CX600', type: AssetType.OTHER, serialNumber: 'SN-TEL-29', defaultSapCode: '5000399', defaultNcm: '0', defaultUnitValue: 400.00, defaultNfeReference: 'Sem nota de Origem 15' },
  { id: '30', tag: 'VC-001', name: 'Video conferência POLYCOM QDX 6000', type: AssetType.OTHER, serialNumber: 'SN-VC-30', defaultSapCode: '5000596', defaultNcm: '0', defaultUnitValue: 500.00, defaultNfeReference: 'Sem nota de Origem 14' },
  { id: '31', tag: 'WC-001', name: 'WebCan Logitech', type: AssetType.OTHER, serialNumber: 'SN-WC-31', defaultSapCode: '5000011', defaultNcm: '8525.80.29', defaultUnitValue: 98.00, defaultNfeReference: 'NF 668' },
  { id: '32', tag: 'AP-001', name: 'ACCESS POINT WIRELES', type: AssetType.ACCESS_POINT, serialNumber: 'SN-AP-32', defaultSapCode: '1069502', defaultNcm: '8517.62.77', defaultUnitValue: 4739.00, defaultNfeReference: '18576' }
];

const defaultAddr = {
  cep: '',
  bp: '',
  state: '',
  plant: '',
  city: '',
  neighborhood: '',
  address: '',
  attentionTo: ''
};

export const INITIAL_REQUESTS: TransportRequest[] = [
  {
    id: 'REQ-001',
    assetIds: ['18'],
    requestAssets: [{ assetId: '18', sapCode: '5000007', ncm: '8471.30.12', nfeReference: 'NF 272071 - E14', unitValue: 4917.98, quantity: 1 }],
    type: RequestType.NF_REMESSA,
    status: RequestStatus.PENDING,
    logisticsStatus: LogisticsStatus.WAITING_NF,
    createdAt: Date.now() - (3 * 24 * 60 * 60 * 1000),
    originDetails: { ...defaultAddr, city: 'São Paulo', state: 'SP', plant: '978G', attentionTo: 'Expedição SP' },
    destinationDetails: { ...defaultAddr, city: 'Belo Horizonte', state: 'MG', plant: '980L', attentionTo: 'João Silva / Suporte BH' },
    method: 'Mail',
    requesterEmail: 'admin@empresa.com',
    totalWeight: '2kg',
    totalVolume: 1
  }
];
