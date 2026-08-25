declare global {
  interface Window {
    go: {
      main: {
        App: {
          // Auth
          Login: (req: { username: string; password: string }) => Promise<{ token: string; user: any }>
          Register: (req: { username: string; email: string; password: string; fullName: string }) => Promise<any>
          GetCurrentSession: () => Promise<any>
          Logout: () => Promise<void>
          GetUsers: () => Promise<any[]>
          GetUser: (id: number) => Promise<any>
          UpdateUser: (id: number, fullName: string, email: string, role: string, active: boolean) => Promise<void>
          DeleteUser: (id: number) => Promise<void>

          // Organization
          GetOrganization: () => Promise<any>
          SaveOrganization: (name: string, address: string, phone: string, email: string, website: string) => Promise<any>

          // Activity Log
          GetActivityLog: (limit: number) => Promise<any[]>

          // Suppliers
          GetSuppliers: (search: string) => Promise<any[]>
          GetSupplier: (id: number) => Promise<any>
          CreateSupplier: (supplier: any) => Promise<any>
          UpdateSupplier: (id: number, supplier: any) => Promise<void>
          DeleteSupplier: (id: number) => Promise<void>
          GetSupplierContacts: (supplierId: number) => Promise<any[]>
          CreateSupplierContact: (contact: any) => Promise<any>
          DeleteSupplierContact: (id: number) => Promise<void>
          GetSupplierNotes: (supplierId: number) => Promise<any[]>
          CreateSupplierNote: (supplierId: number, content: string, userId: number | null) => Promise<any>

          // Products
          GetProducts: (search: string) => Promise<any[]>
          GetProduct: (id: number) => Promise<any>
          CreateProduct: (product: any) => Promise<any>
          UpdateProduct: (id: number, product: any) => Promise<void>
          DeleteProduct: (id: number) => Promise<void>
          GetSupplierProducts: (supplierId: number) => Promise<any[]>
          GetProductSuppliers: (productId: number) => Promise<any[]>
          LinkSupplierProduct: (sp: any) => Promise<any>
          UnlinkSupplierProduct: (id: number) => Promise<void>
          GetPricingHistory: (supplierProductId: number) => Promise<any[]>
          AddPricingHistory: (history: any) => Promise<any>

          // Import/Export
          ParseFile: (fileName: string, fileData: number[], targetType: string) => Promise<any>
          ValidateImport: (targetType: string, mappings: any[], rows: string[][]) => Promise<any[]>
          ExecuteImport: (req: any) => Promise<any>
          GetImportHistory: (limit: number) => Promise<any[]>
          GetImportTemplate: (targetType: string) => Promise<any>
          ExportToCSV: (targetType: string) => Promise<[number[], string]>

          // Extraction (Vision LLM)
          GetExtractionConfig: () => Promise<any>
          SaveExtractionConfig: (provider: string, apiKey: string, model: string) => Promise<void>
          ExtractFromImage: (req: any) => Promise<any>
          SaveExtractedData: (dataType: string, data: any) => Promise<number>

          // Sourcing Requests
          GetSourcingRequests: (status: string, search: string) => Promise<any[]>
          GetSourcingRequest: (id: number) => Promise<any>
          CreateSourcingRequest: (req: any, products: any[]) => Promise<number>
          UpdateSourcingRequest: (id: number, req: any, products: any[]) => Promise<void>
          UpdateSourcingRequestStatus: (id: number, newStatus: string) => Promise<void>
          DeleteSourcingRequest: (id: number) => Promise<void>
          GetSourcingRequestProducts: (sourcingReqId: number) => Promise<any[]>
          GetShortlistedSuppliers: (sourcingReqId: number) => Promise<any[]>
          AddSupplierToShortlist: (sourcingReqId: number, supplierId: number, notes: string) => Promise<number>
          UpdateSupplierShortlistStatus: (id: number, status: string) => Promise<void>
          RemoveSupplierFromShortlist: (id: number) => Promise<void>
          GetSourcingRequestStats: (id: number) => Promise<any>

          // Tenders / RFQs
          GetTenders: (status: string, search: string) => Promise<any[]>
          GetTender: (id: number) => Promise<any>
          CreateTender: (tender: any, items: any[]) => Promise<number>
          UpdateTenderStatus: (id: number, newStatus: string) => Promise<void>
          DeleteTender: (id: number) => Promise<void>
          GetTenderItems: (tenderId: number) => Promise<any[]>
          GetTenderSuppliers: (tenderId: number) => Promise<any[]>
          InviteSupplierToTender: (tenderId: number, supplierId: number) => Promise<number>
          UpdateTenderSupplierStatus: (id: number, status: string) => Promise<void>
          RemoveSupplierFromTender: (id: number) => Promise<void>

          // Quotations
          GetQuotations: (status: string, search: string) => Promise<any[]>
          GetQuotation: (id: number) => Promise<any>
          CreateQuotation: (quotation: any, items: any[]) => Promise<number>
          UpdateQuotationStatus: (id: number, newStatus: string) => Promise<void>
          DeleteQuotation: (id: number) => Promise<void>
          GetQuotationLineItems: (quotationId: number) => Promise<any[]>
          GetQuotationComparison: (tenderId: number) => Promise<any[]>

          // Purchase Orders
          GetPurchaseOrders: (status: string, search: string) => Promise<any[]>
          GetPurchaseOrder: (id: number) => Promise<any>
          CreatePurchaseOrder: (po: any, items: any[]) => Promise<number>
          UpdatePurchaseOrderStatus: (id: number, newStatus: string) => Promise<void>
          DeletePurchaseOrder: (id: number) => Promise<void>
          GetPurchaseOrderLineItems: (poId: number) => Promise<any[]>

          // Customers
          GetCustomers: (search: string) => Promise<any[]>
          GetCustomer: (id: number) => Promise<any>
          CreateCustomer: (customer: any) => Promise<number>
          UpdateCustomer: (id: number, customer: any) => Promise<void>
          DeleteCustomer: (id: number) => Promise<void>
          GetCustomerContacts: (customerId: number) => Promise<any[]>
          CreateCustomerContact: (contact: any) => Promise<number>
          DeleteCustomerContact: (id: number) => Promise<void>

          // Communications
          GetAllCommunications: () => Promise<any[]>
          GetCommunications: (entityType: string, entityId: number) => Promise<any[]>
          CreateCommunication: (comm: any) => Promise<number>
          DeleteCommunication: (id: number) => Promise<void>

          // Documents
          GetDocuments: () => Promise<any[]>
          GetDocumentsByEntity: (entityType: string, entityId: number) => Promise<any[]>
          CreateDocument: (doc: any) => Promise<number>
          DeleteDocument: (id: number) => Promise<void>

          // Analytics
          GetDashboardStats: () => Promise<any>
          GetSpendingBySupplier: () => Promise<any[]>
          GetMonthlySpend: () => Promise<any[]>
          GetTenderPerformance: () => Promise<any[]>
          GetOnTimeDeliveryRate: () => Promise<any[]>
          GetActivityLog: (limit: number) => Promise<any[]>

          // Search + Export
          GlobalSearch: (query: string) => Promise<any[]>
          ExportData: (entityType: string) => Promise<string>
          ExportDataXLSX: (entityType: string) => Promise<string>

          // System
          GetVersion: () => Promise<string>
          GetDataDir: () => Promise<string>
          DeleteSeedData: () => Promise<void>
        }
      }
    }
  }
}

export {}
