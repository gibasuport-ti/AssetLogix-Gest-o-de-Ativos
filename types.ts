
export enum AssetType {
  NOTEBOOK = 'Notebook',
  PC = 'PC/Desktop',
  SWITCH = 'Switch',
  ACCESS_POINT = 'Access Point',
  SERVER = 'Servidor',
  OTHER = 'Outros'
}

export enum RequestType {
  NF_REMESSA = 'Solicitação de NF Remessa',
  TRANSPORT = 'Solicitação de Transporte'
}

export enum RequestStatus {
  PENDING = 'Pendente',
  IN_PROGRESS = 'Em Processamento',
  COMPLETED = 'Concluído',
  DELAYED = 'Em Atraso (> 2 dias)'
}

export enum LogisticsStatus {
  WAITING_NF = 'Aguardando NF',
  WAITING_COLLECTION = 'Aguardando Coleta',
  COLLECTED = 'Coletado',
  DELIVERED = 'Entregue',
  WAITING_MAIL_DELIVERY = 'Aguardando Correio Entregar'
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  UNAUTHORIZED = 'unauthorized'
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: number;
  hasContributed?: boolean;
}

export interface AddressDetails {
  cep: string;
  bp: string;
  state: string;
  plant: string;
  city: string;
  neighborhood: string;
  address: string;
  attentionTo?: string;
}

export interface RequestAsset {
  assetId: string;
  sapCode: string;
  ncm: string;
  nfeReference: string;
  unitValue: number;
  quantity: number;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  type: AssetType;
  serialNumber: string;
  defaultSapCode?: string;
  defaultNcm?: string;
  defaultUnitValue?: number;
  defaultNfeReference?: string;
}

export interface TransportRequest {
  id: string;
  assetIds: string[]; 
  requestAssets: RequestAsset[];
  type: RequestType;
  status: RequestStatus;
  logisticsStatus: LogisticsStatus;
  createdAt: number;
  collectionDate?: number;
  deliveryDate?: number;
  originDetails: AddressDetails;
  destinationDetails: AddressDetails;
  method: 'Carrier' | 'Mail';
  requesterEmail: string;
  totalWeight: string;
  totalVolume: number;
  trackingNumber?: string;
  emailDraft?: string;
  logisticsDraft?: string; 
  invoiceNumber?: string; 
  invoiceDate?: number;
  invoiceFileName?: string; 
  invoiceFileUrl?: string; // Armazena o arquivo em Base64 para download posterior
}

export interface DashboardStats {
  totalRequests: number;
  pendingNF: number;
  pendingTransport: number;
  delayedCount: number;
}
