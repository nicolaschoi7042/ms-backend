import { Dataclass, WSSuccessData, WSEmptyData, WSJobInfo, WSBox, WSJobPallet, WSWorkingBox } from '../utils/wsJsonFormat';

// Unit Test Command
export class UnitTestRequest extends Dataclass {
    message: string;

    constructor(data?: Partial<UnitTestRequest>) {
        super();
        this.message = "";
        Object.assign(this, data);
    }

    set(message: string): UnitTestRequest {
        this.message = message;
        return this;
    }
}

export class UnitTestResponse extends Dataclass {
    message: string;

    constructor(data?: Partial<UnitTestResponse>) {
        super();
        this.message = "";
        Object.assign(this, data);
    }

    set(message: string): UnitTestResponse {
        this.message = message;
        return this;
    }
}

export class UnitTestSrv {
    static _type = "unitTest";
    static _request_class = UnitTestRequest;
    static _response_class = UnitTestResponse;
}

// Empty Command
export class WSEmptyRequest extends WSEmptyData {
    constructor(data?: Partial<WSEmptyRequest>) {
        super();
        Object.assign(this, data);
    }
}

export class WSEmptyResponse extends WSEmptyData {
    constructor(data?: Partial<WSEmptyResponse>) {
        super();
        Object.assign(this, data);
    }
}

export class WSEmptySrv {
    static _type = "";
    static _request_class = WSEmptyRequest;
    static _response_class = WSEmptyResponse;
}

export class WSJobInfoListCallEmptySrv {
    static _type = "/cmp_UI/JobInfoListCall";
    static _request_class = WSEmptyRequest;
    static _response_class = WSEmptyResponse;
}


// Morow Control Command
export class WSControlWordSrvRequest extends Dataclass {
    serial_number: string = "";
    command: number = 0;
    job: object | string | null = "";

    constructor(data?: Partial<WSControlWordSrvRequest>) {
        super();
        Object.assign(this, data);
    }

    set(serial_number: string = "", command: number = 0, job: object | null = null): WSControlWordSrvRequest {
        this.serial_number = serial_number;
        this.command = command;
        this.job = job;
        return this;
    }
}

export class WSControlWordSrvResponse extends WSEmptyData {
    constructor(data?: Partial<WSControlWordSrvResponse>) {
        super();
        Object.assign(this, data);
    }
}

export class WSControlWordSrv {
    static _type = "/morow/controlword";
    static _request_class = WSControlWordSrvRequest;
    static _response_class = WSControlWordSrvResponse;
}

// System Status Command
export class WSSystemStatusRequest extends Dataclass {
    serial_number: string = "";
    type: string = "";
    value: number = 0;

    constructor(data?: Partial<WSSystemStatusRequest>) {
        super();
        Object.assign(this, data);
    }

    set(serial_number: string = "", type: string = "", value: number = 0): WSSystemStatusRequest {
        this.serial_number = serial_number;
        this.type = type;
        this.value = value;
        return this;
    }
}

export class WSSystemStatusResponse extends WSSuccessData {
    constructor(data?: Partial<WSSystemStatusResponse>) {
        super();
        Object.assign(this, data);
    }
}

export class WSSystemStatusSrv {
    static _type = "/cmp_UI/SystemStatus";
    static _request_class = WSSystemStatusRequest;
    static _response_class = WSSystemStatusResponse;
}

// Job Info Command
export class WSJobInfoListRequest extends Dataclass {
    jobList: WSJobInfo[] = [];
    count: number = 0;

    constructor(data?: Partial<WSJobInfoListRequest>) {
        super();
        Object.assign(this, data);
    }

    set(list: WSJobInfo[] = [], count: number = 0): WSJobInfoListRequest {
        this.jobList = list;
        this.count = count;
        return this;
    }
}

export class WSJobInfoListResponse extends WSEmptyData {
    constructor(data?: Partial<WSJobInfoListResponse>) {
        super();
        Object.assign(this, data);
    }
}

export class WSJobInfoListSrv {
    static _type = "/morow/receiveJobInfo";
    static _request_class = WSJobInfoListRequest;
    static _response_class = WSJobInfoListResponse;
}

// Job Setting Command
export class WSJobSettingInfoRequest extends Dataclass {
    serial_number: string = "";
    p1_jobID: string = "";
    p2_jobID: string = "";
    aux_p1_jobID: string = "";
    aux_p2_jobID: string = "";
    pallets: WSJobPallet[] = [];
    box_group_name: string = "";
    boxes: WSBox[] = [];
    sender_id: string = "";
    enable_concurrent: boolean = false;

    constructor(data?: Partial<WSJobSettingInfoRequest>) {
        super();
        Object.assign(this, data);
    }

    set(
        serial_number: string = "",
        p1_jobID: string = "",
        p2_jobID: string = "",
        aux_p1_jobID: string = "",
        aux_p2_jobID: string = "",
        pallets: WSJobPallet[] = [],
        box_group_name: string = "",
        boxes: WSBox[] = [],
        sender_id: string = ""
    ): WSJobSettingInfoRequest {
        this.serial_number = serial_number;
        this.p1_jobID = p1_jobID;
        this.p2_jobID = p2_jobID;
        this.aux_p1_jobID = aux_p1_jobID;
        this.aux_p2_jobID = aux_p2_jobID;
        this.pallets = pallets;
        this.box_group_name = box_group_name;
        this.boxes = boxes;
        this.sender_id = sender_id;
        return this;
    }
}

export class WSJobSettingInfoResponse extends WSSuccessData {
    constructor(data?: Partial<WSJobSettingInfoResponse>) {
        super();
        Object.assign(this, data);
    }
}

export class WSJobSettingInfoSrv {
    static _type = "/cmp_UI/JobSettingInfo";
    static _request_class = WSJobSettingInfoRequest;
    static _response_class = WSJobSettingInfoResponse;
}

// Total Working Boxes Command
export class WSTotalWorkingBoxesRequest extends Dataclass {
    serial_number: string = "";
    name: string = "";
    location: string = "";
    p1_box_list: WSWorkingBox[] = [];
    p2_box_list: WSWorkingBox[] = [];
    aux_p1_box_list: WSWorkingBox[] = [];
    aux_p2_box_list: WSWorkingBox[] = [];

    constructor(data?: Partial<WSTotalWorkingBoxesRequest>) {
        super();
        Object.assign(this, data);
    }

    set(
        serial_number: string = "",
        name: string = "",
        location: string = "",
        p1_box_list: WSWorkingBox[] = [],
        p2_box_list: WSWorkingBox[] = [],
        aux_p1_box_list: WSWorkingBox[] = [],
        aux_p2_box_list: WSWorkingBox[] = []
    ): WSTotalWorkingBoxesRequest {
        this.serial_number = serial_number;
        this.name = name;
        this.location = location;
        this.p1_box_list = p1_box_list;
        this.p2_box_list = p2_box_list;
        this.aux_p1_box_list = aux_p1_box_list;
        this.aux_p2_box_list = aux_p2_box_list;
        return this;
    }
}

export class WSTotalWorkingBoxesResponse extends WSSuccessData {
    constructor(data?: Partial<WSTotalWorkingBoxesResponse>) {
        super();
        Object.assign(this, data);
    }
}

export class WSTotalWorkingBoxesSrv {
    static _type = "/cmp_UI/PreviousJobInfo";
    static _request_class = WSTotalWorkingBoxesRequest;
    static _response_class = WSTotalWorkingBoxesResponse;
}

// Robot Info Command
export class WSGetRobotInfoRequest extends Dataclass {
    constructor(data?: Partial<WSGetRobotInfoRequest>) {
        super();
        Object.assign(this, data);
    }

    set(): WSGetRobotInfoRequest {
        return this;
    }
}

export class WSGetRobotInfoResponse extends Dataclass {
    serial_number: string = "";
    morow_version: string = "";
    vision_version: string = "";
    docker_version: string = "";
    firmware_version: string = "";
    platform: string = "";
    application: string = "";
    project: string = "";

    constructor(data?: Partial<WSGetRobotInfoResponse>) {
        super();
        Object.assign(this, data);
    }

    set(
        serial_number: string = "",
        morow_version: string = "",
        vision_version: string = "",
        docker_version: string = "",
        platform: string = "",
        application: string = "",
        project: string = ""
    ): WSGetRobotInfoResponse {
        this.serial_number = serial_number;
        this.morow_version = morow_version;
        this.vision_version = vision_version;
        this.docker_version = docker_version;
        this.platform = platform;
        this.application = application;
        this.project = project;
        return this;
    }
}

export class WSGetRobotInfoSrv {
    static _type = "/cmp_UI/getRobotInfo";
    static _request_class = WSGetRobotInfoRequest;
    static _response_class = WSGetRobotInfoResponse;
}

// System Info Command
export class WSSystemInfoRequest extends Dataclass {
    serial_number: string = "";
    software_version: string = "";

    constructor(data?: Partial<WSSystemInfoRequest>) {
        super();
        Object.assign(this, data);
    }

    set(serial_number: string = "", software_version: string = ""): WSSystemInfoRequest {
        this.serial_number = serial_number;
        this.software_version = software_version;
        return this;
    }
}

export class WSSystemInfoResponse extends WSSuccessData { }

export class WSSystemInfoSrv {
    static _type = "/cmp_UI/SystemInfo";
    static _request_class = WSSystemInfoRequest;
    static _response_class = WSSystemInfoResponse;
}

// Update Job Status Command
export class WSUpdateJobStatusRequest extends Dataclass {
    serial_number: string = "";
    LoadingRate: number = 0.0;
    LoadHeight: number = 0;
    BPH: number = 0;
    pallet_location: string = "";

    constructor(data?: Partial<WSUpdateJobStatusRequest>) {
        super();
        Object.assign(this, data);
    }

    set(
        serial_number: string = "",
        LoadingRate: number = 0.0,
        LoadHeight: number = 0,
        BPH: number = 0,
        pallet_location: string = ""
    ): WSUpdateJobStatusRequest {
        this.serial_number = serial_number;
        this.LoadingRate = LoadingRate;
        this.LoadHeight = LoadHeight;
        this.BPH = BPH;
        this.pallet_location = pallet_location;
        return this;
    }
}

export class WSUpdateJobStatusResponse extends WSSuccessData { }

export class WSUpdateJobStatusSrv {
    static _type = "/cmp_UI/UpdateJobStatus";
    static _request_class = WSUpdateJobStatusRequest;
    static _response_class = WSUpdateJobStatusResponse;
}

// Barcode Check Command
export class WSBarcodeCheckRequest extends Dataclass {
    Barcode: string = "";
    serial_number: string = "";
    box_type: string = "";

    constructor(data?: Partial<WSBarcodeCheckRequest>) {
        super();
        Object.assign(this, data);
    }

    set(Barcode: string = "", serial_number: string = "", box_type: string = ""): WSBarcodeCheckRequest {
        this.Barcode = Barcode;
        this.serial_number = serial_number;
        this.box_type = box_type;
        return this;
    }
}

export class WSBarcodeCheckResponse extends Dataclass {
    RES: boolean = false;
    ERR_CD: number = 0;
    result_msg: string = "";

    constructor(data?: Partial<WSBarcodeCheckResponse>) {
        super();
        Object.assign(this, data);
    }

    set(RES: boolean = false, ERR_CD: number = 0, result_msg: string = ""): WSBarcodeCheckResponse {
        this.RES = RES;
        this.ERR_CD = ERR_CD;
        this.result_msg = result_msg;
        return this;
    }
}

export class WSBarcodeCheckSrv {
    static _type = "/cmp_UI/BarcodeCheck";
    static _request_class = WSBarcodeCheckRequest;
    static _response_class = WSBarcodeCheckResponse;
}

// Basic Alarm Command
export class WSBasicAlarmRequest extends Dataclass {
    serial_number: string = "";
    stamp: number = 0;
    level: number = 0;
    category: number = 0;
    message_key: number = 0;
    param: string = "";
    isChecked: boolean = false;

    constructor(data?: Partial<WSBasicAlarmRequest>) {
        super();
        Object.assign(this, data);
    }

    set(
        serial_number: string = "",
        stamp: number = 0,
        level: number = 0,
        category: number = 0,
        message_key: number = 0,
        param: string = "",
        isChecked: boolean = false
    ): WSBasicAlarmRequest {
        this.serial_number = serial_number;
        this.stamp = stamp;
        this.level = level;
        this.category = category;
        this.message_key = message_key;
        this.param = param;
        this.isChecked = isChecked;
        return this;
    }
}

export class WSBasicAlarmResponse extends WSSuccessData { }

export class WSBasicAlarmSrv {
    static _type = "/cmp_UI/BasicAlarm";
    static _request_class = WSBasicAlarmRequest;
    static _response_class = WSBasicAlarmResponse;
}

// Event Alarm Command
export class WSEventAlarmRequest extends Dataclass {
    serial_number: string = "";
    message_key: number = 0;

    constructor(data?: Partial<WSEventAlarmRequest>) {
        super();
        Object.assign(this, data);
    }

    set(serial_number: string = "", message_key: number = 0): WSEventAlarmRequest {
        this.serial_number = serial_number;
        this.message_key = message_key;
        return this;
    }
}

export class WSEventAlarmResponse extends WSSuccessData { }

export class WSEventAlarmSrv {
    static _type = "/cmp_UI/EventAlarm";
    static _request_class = WSEventAlarmRequest;
    static _response_class = WSEventAlarmResponse;
}

// SaveDB Command
export class WSSaveDbRequest extends Dataclass {
    serial_number: string = "";

    constructor(data?: Partial<WSSaveDbRequest>) {
        super();
        Object.assign(this, data);
    }

    set(serial_number: string = ""): WSSaveDbRequest {
        this.serial_number = serial_number;
        return this;
    }
}

export class WSSaveDbResponse extends Dataclass {
    p1_box_list: WSWorkingBox[] = [];
    p2_box_list: WSWorkingBox[] = [];
    success: boolean = false;

    constructor(data?: Partial<WSSaveDbResponse>) {
        super();
        Object.assign(this, data);
    }

    set(p1_box_list: WSWorkingBox[], p2_box_list: WSWorkingBox[], success: boolean): WSSaveDbResponse {
        this.p1_box_list = p1_box_list;
        this.p2_box_list = p2_box_list;
        this.success = success;
        return this;
    }
}

export class WSSaveDbSrv {
    static _type = "/cmp_UI/SaveDB";
    static _request_class = WSSaveDbRequest;
    static _response_class = WSSaveDbResponse;
}

// Current Working Box Command
export class WSCurrentWorkingBoxRequest extends Dataclass {
    serial_number: string = "";
    current: WSWorkingBox | null = null;
    isLoading: boolean = false;
    PalletType: string = "";
    jobId: string = "";
    LoadingRate: number = 0.0;
    LoadHeight: number = 0.0;
    BoxPH: number = 0.0;

    constructor(data?: Partial<WSCurrentWorkingBoxRequest>) {
        super();
        Object.assign(this, data);
    }

    set(
        serial_number: string = "",
        current: WSWorkingBox | null = null,
        isLoading: boolean = false,
        PalletType: string = "",
        jobId: string = "",
        LoadingRate: number = 0.0,
        LoadHeight: number = 0.0,
        BoxPH: number = 0.0
    ): WSCurrentWorkingBoxRequest {
        this.serial_number = serial_number;
        this.current = current;
        this.isLoading = isLoading;
        this.PalletType = PalletType;
        this.jobId = jobId;
        this.LoadingRate = LoadingRate;
        this.LoadHeight = LoadHeight;
        this.BoxPH = BoxPH;
        return this;
    }
}

export class WSCurrentWorkingBoxResponse extends WSSuccessData { }

export class WSCurrentWorkingBoxSrv {
    static _type = "/cmp_UI/CurrentWorkingBox";
    static _request_class = WSCurrentWorkingBoxRequest;
    static _response_class = WSCurrentWorkingBoxResponse;
}

// CallJob Command
export class WSCallJobRequest extends Dataclass {
    serial_number: string = "";
    sender_id: string = "";

    constructor(data?: Partial<WSCallJobRequest>) {
        super();
        Object.assign(this, data);
    }

    set(
        serial_number: string = "",
        sender_id: string = ""
    ): WSCallJobRequest {
        this.serial_number = serial_number;
        this.sender_id = sender_id;
        return this;
    }
}

export class WSCallJobResponse extends WSSuccessData { }

export class WSCallJobSrv {
    static _type = "cmp_UI/callJob";
    static _request_class = WSCallJobRequest;
    static _response_class = WSCallJobResponse;
}

export class WSCallPrevJobSrv {
    static _type = "cmp_UI/callPrevJob";
    static _request_class = WSCallJobRequest;
    static _response_class = WSCallJobResponse;
}

// Delete Job Command
export class WSDeleteJobRequest extends Dataclass {
    id: string = "";

    constructor(data?: Partial<WSDeleteJobRequest>) {
        super();
        Object.assign(this, data);
    }

    set(id: string = ""): WSDeleteJobRequest {
        this.id = id;
        return this;
    }
}

export class WSDeleteJobResponse extends WSSuccessData { }

export class WSDeleteJobSrv {
    static _type = "/cmp_UI/deleteJob";
    static _request_class = WSDeleteJobRequest;
    static _response_class = WSDeleteJobResponse;
}

// Gripper Control Command
export class WSGripperControlRequest extends Dataclass {
    serial_number: string = "";
    ch: number = 0;
    cmd: boolean = false;

    constructor(data?: Partial<WSGripperControlRequest>) {
        super();
        Object.assign(this, data);
    }

    set(serial_number: string = "", ch: number = 0, cmd: boolean = false): WSGripperControlRequest {
        this.serial_number = serial_number;
        this.ch = ch;
        this.cmd = cmd;
        return this;
    }
}

export class WSGripperControlResponse extends WSSuccessData { }

export class WSGripperConotrlSrv {
    static _type = "/morow/gripperControl";
    static _request_class = WSGripperControlRequest;
    static _response_class = WSGripperControlResponse;
}

////////////////////////////////for message packet ////////////////////////////////
// ---------------------------------------------------------------------------------------------
// UnitTestMsg
// ---------------------------------------------------------------------------------------------

export class UnitTestMsg extends Dataclass {
    message: string = "";

    set(message: string): UnitTestMsg {
        this.message = message;
        return this;
    }
}

// ---------------------------------------------------------------------------------------------
// WSButtonH2RMsg
// ---------------------------------------------------------------------------------------------

export class WSButtonH2RMsg extends Dataclass {
    stamp: number = 0.0;
    count: number = 0;

    set(stamp: number = 0.0, count: number = 0): WSButtonH2RMsg {
        this.stamp = stamp;
        this.count = count;
        return this;
    }
}

// ---------------------------------------------------------------------------------------------
// WSStatusWordMsg
// ---------------------------------------------------------------------------------------------

export class WSStatusWordMsg extends Dataclass {
    serial_number: string = "";
    name: string = "";
    num: number = 0;

    set(serial_number: string = "", name: string = "", num: number = 0): WSStatusWordMsg {
        this.serial_number = serial_number;
        this.name = name;
        this.num = num;
        return this;
    }
}

export class WSMorrowStatusWordSrv {
    static _type = "/morow/statusword";
}