export class Dataclass {
    toDict(): { [key: string]: any } {
        return { ...this };
    }

    toJsonStr(): string {
        return JSON.stringify(this.toDict());
    }

    debug(): void {
        console.log(JSON.stringify(this.toDict(), null, 4));
    }
}

// ==========================================================================================
// Basic data class
// ==========================================================================================

export class WebPacket extends Dataclass {
    packet_name: string = "";
    packet_type: string = "";
    packet_class: Dataclass | null = null;

    constructor(data?: Partial<WebPacket>) {
        super();
        Object.assign(this, data);
    }

    set(packet_name: string = "", packet_type: string = "", packet_class: Dataclass | null = null): WebPacket {
        this.packet_name = packet_name;
        this.packet_type = packet_type;
        this.packet_class = packet_class;
        return this;
    }
}

// ==========================================================================================
// Data class for WSBox
// ==========================================================================================

export class WSBox extends Dataclass {
    name: string = "";
    size: number[] | null = null;

    constructor(data?: Partial<WSBox>) {
        super();
        Object.assign(this, data);
    }

    set(name: string = "", size: number[] = []): WSBox {
        this.name = name;
        this.size = size;
        return this;
    }
}

// ==========================================================================================
// Data class for WSJobPallet
// ==========================================================================================

export class WSJobPallet extends Dataclass {
    orderGroup: string = "";
    palletSpecName: string = "";
    size: number[] = [];
    jobBoxes: WSBox[] = [];
    loadingHeight: number = 0;
    isBuffer: boolean = false;
    isError: boolean = false;
    isUsed: boolean = false;
    location: string = "";
    palletBarcode: string = "";
    chuteNo: string = "";
    loadingPatternName: string = "";
    boxGroupName: string = "";

    constructor(data?: Partial<WSJobPallet>) {
        super();
        Object.assign(this, data);
    }

    set(
        orderGroup: string = "",
        palletSpecName: string = "",
        size: number[] = [],
        jobBoxes: WSBox[] = [],
        loadingHeight: number = 0,
        isBuffer: boolean = false,
        isError: boolean = false,
        isUsed: boolean = false,
        location: string = "",
        palletBarcode: string = "",
        chuteNo: string = "",
        loadingPatternName: string = "",
        boxGroupName: string = ""
    ): WSJobPallet {
        this.orderGroup = orderGroup;
        this.palletSpecName = palletSpecName;
        this.size = size;
        this.jobBoxes = jobBoxes;
        this.loadingHeight = loadingHeight;
        this.isBuffer = isBuffer;
        this.isError = isError;
        this.isUsed = isUsed;
        this.location = location;
        this.palletBarcode = palletBarcode;
        this.chuteNo = chuteNo;
        this.loadingPatternName = loadingPatternName;
        this.boxGroupName = boxGroupName;
        return this;
    }
}

// ==========================================================================================
// Data class for WSWorkingBox
// ==========================================================================================

export class WSWorkingBox extends Dataclass {
    name: string = "";
    barcode: string = "";
    box_id: number = 0;
    loading_order: number = 0;
    rotation_type: number = 0;
    pallet_location: string = "";
    job_id: string = "";
    position: number[] | null = null;
    length: number[] | null = null;

    constructor(data?: Partial<WSWorkingBox>) {
        super();
        Object.assign(this, data);
    }

    set(
        name: string = "",
        barcode: string = "",
        box_id: number = 0,
        loading_order: number = 0,
        rotation_type: number = 0,
        pallet_location: string = "",
        job_id: string = "",
        position: number[] = [],
        length: number[] = []
    ): WSWorkingBox {
        this.name = name;
        this.barcode = barcode;
        this.box_id = box_id;
        this.loading_order = loading_order;
        this.rotation_type = rotation_type;
        this.pallet_location = pallet_location;
        this.job_id = job_id;
        this.position = position;
        this.length = length;
        return this;
    }
}

// ==========================================================================================
// Data class for JobInfo
// ==========================================================================================

export class WSJobInfo extends Dataclass {
    name: string = "";
    location: string = "";

    constructor(data?: Partial<WSJobInfo>) {
        super();
        Object.assign(this, data);
    }

    set(name: string = "", location: string = ""): WSJobInfo {
        this.name = name;
        this.location = location;
        return this;
    }
}

// ==========================================================================================
// General classes
// ==========================================================================================

export class WSSuccessData extends Dataclass {
    success: boolean = false;

    constructor(data?: Partial<WSSuccessData>) {
        super();
        Object.assign(this, data);
    }

    set(success: boolean): WSSuccessData {
        this.success = success;
        return this;
    }
}

export class WSEmptyData extends Dataclass {
    constructor(data?: Partial<WSEmptyData>) {
        super();
        Object.assign(this, data);
    }

    set(): WSEmptyData {
        return this;
    }
}
