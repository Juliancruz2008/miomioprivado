// Forma de una estación tal como la devuelve OpenChargeMap (OCM).
export interface EstacionOCM {
  ID: number | string;
  City?: string;
  ciudad?: string;
  departamento?: string;
  StateOrProvince?: string;
  AddressInfo?: {
    Title?: string;
    AddressLine1?: string;
    Town?: string;
    City?: string;
    StateOrProvince?: string;
    Latitude: number;
    Longitude: number;
  };
  OperatorInfo?: { Title?: string };
  Connections?: Array<{
    ConnectionType?: { Title?: string };
    PowerKW?: number;
    CurrentType?: { Title?: string };
    Quantity?: number;
  }>;
}
