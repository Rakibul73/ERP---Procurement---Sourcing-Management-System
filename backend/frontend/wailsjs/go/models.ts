export namespace main {
	
	export class ActivityLogEntry {
	    id: number;
	    userId?: number;
	    action: string;
	    entityType: string;
	    entityId?: number;
	    details: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new ActivityLogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.userId = source["userId"];
	        this.action = source["action"];
	        this.entityType = source["entityType"];
	        this.entityId = source["entityId"];
	        this.details = source["details"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class ColumnMapping {
	    columnIndex: number;
	    columnName: string;
	    fieldName: string;
	
	    static createFrom(source: any = {}) {
	        return new ColumnMapping(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.columnIndex = source["columnIndex"];
	        this.columnName = source["columnName"];
	        this.fieldName = source["fieldName"];
	    }
	}
	export class Communication {
	    id: number;
	    entityType: string;
	    entityId: number;
	    direction: string;
	    channel: string;
	    subject: string;
	    content: string;
	    contactName: string;
	    contactEmail: string;
	    contactPhone: string;
	    attachments: string;
	    createdBy?: number;
	    createdByName: string;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Communication(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.entityType = source["entityType"];
	        this.entityId = source["entityId"];
	        this.direction = source["direction"];
	        this.channel = source["channel"];
	        this.subject = source["subject"];
	        this.content = source["content"];
	        this.contactName = source["contactName"];
	        this.contactEmail = source["contactEmail"];
	        this.contactPhone = source["contactPhone"];
	        this.attachments = source["attachments"];
	        this.createdBy = source["createdBy"];
	        this.createdByName = source["createdByName"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CreateUserRequest {
	    username: string;
	    email: string;
	    password: string;
	    fullName: string;
	    role: string;
	
	    static createFrom(source: any = {}) {
	        return new CreateUserRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.email = source["email"];
	        this.password = source["password"];
	        this.fullName = source["fullName"];
	        this.role = source["role"];
	    }
	}
	export class Customer {
	    id: number;
	    companyName: string;
	    address: string;
	    phone: string;
	    email: string;
	    website: string;
	    notes: string;
	    active: boolean;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Customer(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.companyName = source["companyName"];
	        this.address = source["address"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.website = source["website"];
	        this.notes = source["notes"];
	        this.active = source["active"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CustomerContact {
	    id: number;
	    customerId: number;
	    fullName: string;
	    email: string;
	    phone: string;
	    position: string;
	    isPrimary: boolean;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new CustomerContact(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.customerId = source["customerId"];
	        this.fullName = source["fullName"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.position = source["position"];
	        this.isPrimary = source["isPrimary"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DashboardStats {
	    totalSuppliers: number;
	    activeSuppliers: number;
	    totalProducts: number;
	    totalCustomers: number;
	    pendingPOs: number;
	    totalPOValue: number;
	    draftPOs: number;
	    approvedPOs: number;
	    sentPOs: number;
	    confirmedPOs: number;
	    deliveredPOs: number;
	    openSourcing: number;
	    openTenders: number;
	    receivedQuotations: number;
	
	    static createFrom(source: any = {}) {
	        return new DashboardStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalSuppliers = source["totalSuppliers"];
	        this.activeSuppliers = source["activeSuppliers"];
	        this.totalProducts = source["totalProducts"];
	        this.totalCustomers = source["totalCustomers"];
	        this.pendingPOs = source["pendingPOs"];
	        this.totalPOValue = source["totalPOValue"];
	        this.draftPOs = source["draftPOs"];
	        this.approvedPOs = source["approvedPOs"];
	        this.sentPOs = source["sentPOs"];
	        this.confirmedPOs = source["confirmedPOs"];
	        this.deliveredPOs = source["deliveredPOs"];
	        this.openSourcing = source["openSourcing"];
	        this.openTenders = source["openTenders"];
	        this.receivedQuotations = source["receivedQuotations"];
	    }
	}
	export class Document {
	    id: number;
	    entityType: string;
	    entityId: number;
	    fileName: string;
	    filePath: string;
	    fileType: string;
	    description: string;
	    uploadedBy?: number;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Document(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.entityType = source["entityType"];
	        this.entityId = source["entityId"];
	        this.fileName = source["fileName"];
	        this.filePath = source["filePath"];
	        this.fileType = source["fileType"];
	        this.description = source["description"];
	        this.uploadedBy = source["uploadedBy"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class ExtractedData {
	    type: string;
	    confidence: number;
	    data: Record<string, any>;
	    rawText: string;
	    // Go type: time
	    extractedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new ExtractedData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.confidence = source["confidence"];
	        this.data = source["data"];
	        this.rawText = source["rawText"];
	        this.extractedAt = this.convertValues(source["extractedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExtractionConfig {
	    provider: string;
	    apiKey: string;
	    model: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtractionConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.provider = source["provider"];
	        this.apiKey = source["apiKey"];
	        this.model = source["model"];
	    }
	}
	export class ExtractionRequest {
	    fileName: string;
	    fileData: number[];
	    fileType: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtractionRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.fileName = source["fileName"];
	        this.fileData = source["fileData"];
	        this.fileType = source["fileType"];
	    }
	}
	export class ExtractionResult {
	    success: boolean;
	    data?: ExtractedData;
	    error?: string;
	    provider: string;
	    model: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtractionResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.data = this.convertValues(source["data"], ExtractedData);
	        this.error = source["error"];
	        this.provider = source["provider"];
	        this.model = source["model"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImportExecuteRequest {
	    fileName: string;
	    targetType: string;
	    mappings: ColumnMapping[];
	    rows: string[][];
	
	    static createFrom(source: any = {}) {
	        return new ImportExecuteRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.fileName = source["fileName"];
	        this.targetType = source["targetType"];
	        this.mappings = this.convertValues(source["mappings"], ColumnMapping);
	        this.rows = source["rows"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImportJob {
	    id: number;
	    fileName: string;
	    fileType: string;
	    entityType: string;
	    status: string;
	    totalRows: number;
	    successfulRows: number;
	    failedRows: number;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    completedAt?: any;
	
	    static createFrom(source: any = {}) {
	        return new ImportJob(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fileName = source["fileName"];
	        this.fileType = source["fileType"];
	        this.entityType = source["entityType"];
	        this.status = source["status"];
	        this.totalRows = source["totalRows"];
	        this.successfulRows = source["successfulRows"];
	        this.failedRows = source["failedRows"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.completedAt = this.convertValues(source["completedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ImportPreview {
	    headers: string[];
	    rows: string[][];
	    totalRows: number;
	    targetType: string;
	    fileName: string;
	
	    static createFrom(source: any = {}) {
	        return new ImportPreview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.headers = source["headers"];
	        this.rows = source["rows"];
	        this.totalRows = source["totalRows"];
	        this.targetType = source["targetType"];
	        this.fileName = source["fileName"];
	    }
	}
	export class ImportResult {
	    importId: number;
	    totalRows: number;
	    importedRows: number;
	    skippedRows: number;
	    errorRows: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new ImportResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.importId = source["importId"];
	        this.totalRows = source["totalRows"];
	        this.importedRows = source["importedRows"];
	        this.skippedRows = source["skippedRows"];
	        this.errorRows = source["errorRows"];
	        this.status = source["status"];
	    }
	}
	export class ImportValidation {
	    rowIndex: number;
	    errors: string[];
	
	    static createFrom(source: any = {}) {
	        return new ImportValidation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rowIndex = source["rowIndex"];
	        this.errors = source["errors"];
	    }
	}
	export class LoginRequest {
	    username: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new LoginRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.password = source["password"];
	    }
	}
	export class User {
	    id: number;
	    username: string;
	    email: string;
	    fullName: string;
	    role: string;
	    active: boolean;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.username = source["username"];
	        this.email = source["email"];
	        this.fullName = source["fullName"];
	        this.role = source["role"];
	        this.active = source["active"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class LoginResponse {
	    token: string;
	    user: User;
	
	    static createFrom(source: any = {}) {
	        return new LoginResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.token = source["token"];
	        this.user = this.convertValues(source["user"], User);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MonthlySpend {
	    month: string;
	    amount: number;
	
	    static createFrom(source: any = {}) {
	        return new MonthlySpend(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.month = source["month"];
	        this.amount = source["amount"];
	    }
	}
	export class OnTimeDelivery {
	    month: string;
	    onTimeCount: number;
	    lateCount: number;
	    onTimeRate: number;
	
	    static createFrom(source: any = {}) {
	        return new OnTimeDelivery(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.month = source["month"];
	        this.onTimeCount = source["onTimeCount"];
	        this.lateCount = source["lateCount"];
	        this.onTimeRate = source["onTimeRate"];
	    }
	}
	export class Organization {
	    id: number;
	    name: string;
	    address: string;
	    phone: string;
	    email: string;
	    website: string;
	    logoPath: string;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Organization(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.address = source["address"];
	        this.phone = source["phone"];
	        this.email = source["email"];
	        this.website = source["website"];
	        this.logoPath = source["logoPath"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class PricingHistory {
	    id: number;
	    supplierProductId: number;
	    price: number;
	    currency: string;
	    effectiveDate: string;
	    notes: string;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new PricingHistory(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.supplierProductId = source["supplierProductId"];
	        this.price = source["price"];
	        this.currency = source["currency"];
	        this.effectiveDate = source["effectiveDate"];
	        this.notes = source["notes"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class Product {
	    id: number;
	    name: string;
	    category: string;
	    specifications: string;
	    gradeType: string;
	    manufacturer: string;
	    countryOfOrigin: string;
	    notes: string;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Product(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.category = source["category"];
	        this.specifications = source["specifications"];
	        this.gradeType = source["gradeType"];
	        this.manufacturer = source["manufacturer"];
	        this.countryOfOrigin = source["countryOfOrigin"];
	        this.notes = source["notes"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class PurchaseOrder {
	    id: number;
	    quotationId?: number;
	    supplierId: number;
	    supplierName: string;
	    poNumber: string;
	    status: string;
	    totalAmount: number;
	    currency: string;
	    orderDate?: string;
	    expectedDelivery?: string;
	    actualDelivery?: string;
	    paymentTerms: string;
	    shippingTerms: string;
	    deliveryAddress: string;
	    notes: string;
	    createdBy?: number;
	    createdByName: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new PurchaseOrder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.quotationId = source["quotationId"];
	        this.supplierId = source["supplierId"];
	        this.supplierName = source["supplierName"];
	        this.poNumber = source["poNumber"];
	        this.status = source["status"];
	        this.totalAmount = source["totalAmount"];
	        this.currency = source["currency"];
	        this.orderDate = source["orderDate"];
	        this.expectedDelivery = source["expectedDelivery"];
	        this.actualDelivery = source["actualDelivery"];
	        this.paymentTerms = source["paymentTerms"];
	        this.shippingTerms = source["shippingTerms"];
	        this.deliveryAddress = source["deliveryAddress"];
	        this.notes = source["notes"];
	        this.createdBy = source["createdBy"];
	        this.createdByName = source["createdByName"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PurchaseOrderLineItem {
	    id: number;
	    purchaseOrderId: number;
	    productName: string;
	    specifications: string;
	    quantity: number;
	    unitPrice: number;
	    totalPrice: number;
	    notes: string;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new PurchaseOrderLineItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.purchaseOrderId = source["purchaseOrderId"];
	        this.productName = source["productName"];
	        this.specifications = source["specifications"];
	        this.quantity = source["quantity"];
	        this.unitPrice = source["unitPrice"];
	        this.totalPrice = source["totalPrice"];
	        this.notes = source["notes"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Quotation {
	    id: number;
	    tenderId?: number;
	    supplierId: number;
	    supplierName: string;
	    sourcingRequestId?: number;
	    title: string;
	    status: string;
	    currency: string;
	    validityDate?: string;
	    shippingTerms: string;
	    paymentTerms: string;
	    leadTimeDays?: number;
	    notes: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Quotation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.tenderId = source["tenderId"];
	        this.supplierId = source["supplierId"];
	        this.supplierName = source["supplierName"];
	        this.sourcingRequestId = source["sourcingRequestId"];
	        this.title = source["title"];
	        this.status = source["status"];
	        this.currency = source["currency"];
	        this.validityDate = source["validityDate"];
	        this.shippingTerms = source["shippingTerms"];
	        this.paymentTerms = source["paymentTerms"];
	        this.leadTimeDays = source["leadTimeDays"];
	        this.notes = source["notes"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class QuotationComparisonRow {
	    supplierName: string;
	    productName: string;
	    unitPrice: number;
	    quantity: number;
	    totalPrice: number;
	    moq?: number;
	    leadTimeDays?: number;
	    paymentTerms: string;
	    shippingTerms: string;
	    currency: string;
	    quotationId: number;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new QuotationComparisonRow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.supplierName = source["supplierName"];
	        this.productName = source["productName"];
	        this.unitPrice = source["unitPrice"];
	        this.quantity = source["quantity"];
	        this.totalPrice = source["totalPrice"];
	        this.moq = source["moq"];
	        this.leadTimeDays = source["leadTimeDays"];
	        this.paymentTerms = source["paymentTerms"];
	        this.shippingTerms = source["shippingTerms"];
	        this.currency = source["currency"];
	        this.quotationId = source["quotationId"];
	        this.status = source["status"];
	    }
	}
	export class QuotationLineItem {
	    id: number;
	    quotationId: number;
	    productName: string;
	    specifications: string;
	    quantity: number;
	    unitPrice: number;
	    moq?: number;
	    leadTimeDays?: number;
	    notes: string;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new QuotationLineItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.quotationId = source["quotationId"];
	        this.productName = source["productName"];
	        this.specifications = source["specifications"];
	        this.quantity = source["quantity"];
	        this.unitPrice = source["unitPrice"];
	        this.moq = source["moq"];
	        this.leadTimeDays = source["leadTimeDays"];
	        this.notes = source["notes"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RegisterRequest {
	    username: string;
	    email: string;
	    password: string;
	    fullName: string;
	
	    static createFrom(source: any = {}) {
	        return new RegisterRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.email = source["email"];
	        this.password = source["password"];
	        this.fullName = source["fullName"];
	    }
	}
	export class SearchResult {
	    entityType: string;
	    entityId: number;
	    title: string;
	    subtitle: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new SearchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.entityType = source["entityType"];
	        this.entityId = source["entityId"];
	        this.title = source["title"];
	        this.subtitle = source["subtitle"];
	        this.path = source["path"];
	    }
	}
	export class SourcingRequest {
	    id: number;
	    title: string;
	    description: string;
	    status: string;
	    priority: string;
	    targetDate: string;
	    budget: number;
	    currency: string;
	    createdBy: number;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new SourcingRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.description = source["description"];
	        this.status = source["status"];
	        this.priority = source["priority"];
	        this.targetDate = source["targetDate"];
	        this.budget = source["budget"];
	        this.currency = source["currency"];
	        this.createdBy = source["createdBy"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SourcingRequestProduct {
	    id: number;
	    sourcingRequestId: number;
	    productId: number;
	    productName: string;
	    quantity: number;
	    unit: string;
	    specifications: string;
	    estimatedBudget: number;
	
	    static createFrom(source: any = {}) {
	        return new SourcingRequestProduct(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sourcingRequestId = source["sourcingRequestId"];
	        this.productId = source["productId"];
	        this.productName = source["productName"];
	        this.quantity = source["quantity"];
	        this.unit = source["unit"];
	        this.specifications = source["specifications"];
	        this.estimatedBudget = source["estimatedBudget"];
	    }
	}
	export class SpendingBySupplier {
	    supplierName: string;
	    totalSpend: number;
	    poCount: number;
	
	    static createFrom(source: any = {}) {
	        return new SpendingBySupplier(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.supplierName = source["supplierName"];
	        this.totalSpend = source["totalSpend"];
	        this.poCount = source["poCount"];
	    }
	}
	export class Supplier {
	    id: number;
	    companyName: string;
	    country: string;
	    address: string;
	    website: string;
	    email: string;
	    phone: string;
	    supplierType: string;
	    notes: string;
	    active: boolean;
	    createdAt: string;
	    updatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new Supplier(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.companyName = source["companyName"];
	        this.country = source["country"];
	        this.address = source["address"];
	        this.website = source["website"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.supplierType = source["supplierType"];
	        this.notes = source["notes"];
	        this.active = source["active"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class SupplierContact {
	    id: number;
	    supplierId: number;
	    fullName: string;
	    email: string;
	    phone: string;
	    whatsapp: string;
	    position: string;
	    isPrimary: boolean;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SupplierContact(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.supplierId = source["supplierId"];
	        this.fullName = source["fullName"];
	        this.email = source["email"];
	        this.phone = source["phone"];
	        this.whatsapp = source["whatsapp"];
	        this.position = source["position"];
	        this.isPrimary = source["isPrimary"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class SupplierNote {
	    id: number;
	    supplierId: number;
	    content: string;
	    userId?: number;
	    createdAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SupplierNote(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.supplierId = source["supplierId"];
	        this.content = source["content"];
	        this.userId = source["userId"];
	        this.createdAt = source["createdAt"];
	    }
	}
	export class SupplierProduct {
	    id: number;
	    supplierId: number;
	    productId: number;
	    unitPrice: number;
	    currency: string;
	    moq: number;
	    leadTimeDays: number;
	    paymentTerms: string;
	    notes: string;
	    createdAt: string;
	    updatedAt: string;
	    supplierName?: string;
	    productName?: string;
	
	    static createFrom(source: any = {}) {
	        return new SupplierProduct(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.supplierId = source["supplierId"];
	        this.productId = source["productId"];
	        this.unitPrice = source["unitPrice"];
	        this.currency = source["currency"];
	        this.moq = source["moq"];
	        this.leadTimeDays = source["leadTimeDays"];
	        this.paymentTerms = source["paymentTerms"];
	        this.notes = source["notes"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	        this.supplierName = source["supplierName"];
	        this.productName = source["productName"];
	    }
	}
	export class SupplierShortlist {
	    id: number;
	    sourcingRequestId: number;
	    supplierId: number;
	    supplierName: string;
	    status: string;
	    notes: string;
	    ranking: number;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new SupplierShortlist(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.sourcingRequestId = source["sourcingRequestId"];
	        this.supplierId = source["supplierId"];
	        this.supplierName = source["supplierName"];
	        this.status = source["status"];
	        this.notes = source["notes"];
	        this.ranking = source["ranking"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Tender {
	    id: number;
	    title: string;
	    sourcingRequestId?: number;
	    deadline: string;
	    status: string;
	    notes: string;
	    createdBy: number;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Tender(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.sourcingRequestId = source["sourcingRequestId"];
	        this.deadline = source["deadline"];
	        this.status = source["status"];
	        this.notes = source["notes"];
	        this.createdBy = source["createdBy"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TenderItem {
	    id: number;
	    tenderId: number;
	    productName: string;
	    specifications: string;
	    quantity: number;
	    unit: string;
	
	    static createFrom(source: any = {}) {
	        return new TenderItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.tenderId = source["tenderId"];
	        this.productName = source["productName"];
	        this.specifications = source["specifications"];
	        this.quantity = source["quantity"];
	        this.unit = source["unit"];
	    }
	}
	export class TenderPerformance {
	    tenderTitle: string;
	    quoteCount: number;
	    status: string;
	    lowestQuote: number;
	    avgQuote: number;
	
	    static createFrom(source: any = {}) {
	        return new TenderPerformance(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tenderTitle = source["tenderTitle"];
	        this.quoteCount = source["quoteCount"];
	        this.status = source["status"];
	        this.lowestQuote = source["lowestQuote"];
	        this.avgQuote = source["avgQuote"];
	    }
	}
	export class TenderSupplier {
	    id: number;
	    tenderId: number;
	    supplierId: number;
	    supplierName: string;
	    status: string;
	    responseDate?: string;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new TenderSupplier(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.tenderId = source["tenderId"];
	        this.supplierId = source["supplierId"];
	        this.supplierName = source["supplierName"];
	        this.status = source["status"];
	        this.responseDate = source["responseDate"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

