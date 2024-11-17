import { UnitTestRequest, UnitTestResponse, WSCurrentWorkingBoxRequest, WSJobSettingInfoRequest } from "../utils/wsJsonExtendedFormat";
import { WebPacket, WSWorkingBox, WSJobPallet, WSBox } from "../utils/wsJsonFormat";


async function testJSonParse1() {
    const p1 = new WSJobPallet().set("orderGroup", "palletSpecName", [0, 0, 0], [], 0, false, false, false, "location", "palletBarcode", "0", "", "");
    const box = new WSBox().set("box_name", [10, 20, 30]);

    const jsi = new WSJobSettingInfoRequest();
    jsi.serial_number = "MOROW001";
    jsi.aux_p1_jobID = "aux_p1_jobID";
    jsi.aux_p2_jobID = "aux_p2_jobID";
    jsi.p1_jobID = "p1_jobID";
    jsi.p2_jobID = "p2_jobID";
    jsi.pallets = [p1, p1];
    jsi.box_group_name = "box_group_name";
    jsi.boxes = [box, box];
    jsi.sender_id = "1";

    const webPacketReq = new WebPacket();
    webPacketReq.set("unitest", "request", jsi);
    const data = webPacketReq.toJsonStr();
    console.log(`webPacketReq json:`);
    console.log(`${data}`);
    console.log(`end`);

    console.log(`convert back to WebPacket object`);
    const jsonMessage = JSON.parse(data.toString());
    // Deserialize the WebPacket and its nested objects
    const webPacket = jsonMessage as WebPacket;

    console.log(`web packet:`);
    console.log(`${JSON.stringify(webPacket)}`);
    console.log(`end`);

    // Check if packet_class is not null before using it
    if (webPacket.packet_class) {
        // Cast packet_class to WSJobSettingInfoRequest
        const jobSettingInfoReq = webPacket.packet_class as WSJobSettingInfoRequest;
        console.log(`WSJobSettingInfoRequest:`);
        console.log(`${JSON.stringify(jobSettingInfoReq)}`);
        console.log(`${jobSettingInfoReq.aux_p1_jobID}`);
        console.log(`${jobSettingInfoReq.aux_p2_jobID}`);

        // Check the instance of pallets if needed
        if (jobSettingInfoReq.pallets && jobSettingInfoReq.pallets.length > 0) {
            // const pallet0 = jobSettingInfoReq.pallets[0] as WSJobPallet;
            const pallet0 = jobSettingInfoReq.pallets[0];
            console.log(`1st WSJobPallet:`);
            console.log(`${JSON.stringify(pallet0)}`);
            console.log(`${pallet0.boxGroupName}`);
        }

        if (jobSettingInfoReq.boxes && jobSettingInfoReq.boxes.length > 0) {
            // const boxes = jobSettingInfoReq.boxes as WSBox[];
            // const box0 = boxes[0];
            const box0 = jobSettingInfoReq.boxes[0];
            console.log(`1st WSBox:`);
            console.log(`${JSON.stringify(box0)}`);
            console.log(`${box0.name}`);
            console.log(`${box0.size}`);

        }
    } else {
        console.log(`webPacket.packet_class is null or undefined.`);
    }
}

async function testJSonParse2() {

    // Assuming you have imported your classes from the module
    // Example JSON received from the WebSocket server
    // Example JSON received from the WebSocket server
    const jsonString = `
{
    "packet_name": "SamplePacket",
    "packet_type": "TypeA",
    "packet_class": {
        "orderGroup": "Order1",
        "palletSpecName": "Spec1",
        "size": [10, 20],
        "jobBoxes": [
            {
                "name": "Box1",
                "size": [5, 10]
            },
            {
                "name": "Box2",
                "size": [7, 14]
            }
        ],
        "loadingHeight": 5,
        "isBuffer": true,
        "isError": false,
        "isUsed": true,
        "location": "Location1",
        "palletBarcode": "123456",
        "chuteNo": "Chute1",
        "loadingPatternName": "Pattern1",
        "boxGroupName": "Group1"
    }
}
`;

    // Parse the JSON string to an object
    const receivedData = JSON.parse(jsonString);
    const webPacket = receivedData as WebPacket;

    console.log(`is webPacket instance of WebPacket: ${webPacket instanceof WebPacket}`);
    console.log(`${webPacket.packet_name}}`);
    console.log(`${webPacket.packet_type}}`);
    console.log(`${webPacket.packet_class}}`);

    const wsJobPallet = webPacket.packet_class as WSJobPallet;
    console.log(`is wsJobPallet instance of WSJobPallet: ${wsJobPallet instanceof WSJobPallet}`);
    console.log(`${JSON.stringify(wsJobPallet)}`);
    console.log(`${wsJobPallet.boxGroupName}`)
    console.log(`${wsJobPallet.chuteNo}`)
    console.log(`${JSON.stringify(wsJobPallet.jobBoxes)}`)

    const box = wsJobPallet.jobBoxes as WSBox[];
    console.log(`is box instance of WSBox: ${box[0] instanceof WSBox}`);
    console.log(`${box[0].name}`);
    console.log(`${box[0].size}`);
}

async function testJSonParse3() {
    const ss = new WSCurrentWorkingBoxRequest();
    ss.serial_number = "MOROW001";
    ss.current = new WSWorkingBox();
    ss.current.set("test", "barcode", 30, 80, 80, "pallet_location", "job_id", [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]);
    ss.isLoading = false;
    ss.PalletType = "PalletType";
    ss.jobId = "JobId";
    ss.LoadingRate = 90.0;
    ss.LoadHeight = 80.0;
    ss.BoxPH = 0.0;

    const webPacketReq = new WebPacket();
    webPacketReq.set("unitest", "request", ss);
    const data = webPacketReq.toJsonStr();
    console.log(`webPacketReq json:`);
    console.log(`${data}`);
    console.log(`end`);

    console.log(`convert back to WebPacket object`);
    const jsonMessage = JSON.parse(data.toString());
    // Deserialize the WebPacket and its nested objects
    const webPacket = jsonMessage as WebPacket;

    console.log(`web packet:`);
    console.log(`${JSON.stringify(webPacket)}`);
    console.log(`end`);

    console.log(`Current WSWorkingBox:`);
    const request = webPacket.packet_class as WSCurrentWorkingBoxRequest;
    if (request.current != null) {
        const workingbox: WSWorkingBox = request.current;
        console.log("cmp_UI/CurrnetWorkingBox: ", workingbox);

        const {
            pallet_location,
            name,
            box_id,
            barcode,
            loading_order,
            rotation_type,
            position,
            length,
            job_id,
        } = request.current;

        console.log(`pallet_location: ${pallet_location}, name: ${name}, box_id: ${box_id}, barcode: ${barcode}`);

    }
};




// Run the tests
// runTests();
// testJSonParse1();
// testJSonParse2();
testJSonParse3();


// export async function getSampleData(): Promise<WSJobSettingInfoRequest> {
// // Test WebPacket
// const pkt = new WebPacket().set("unitTest", "request", new UnitTestRequest("hi"));
// const txd = pkt.toJsonStr();
// console.log(txd);

// const rxd = new WebPacket();
// Object.assign(rxd, JSON.parse(txd));

// // Check if packet_class is not null and cast it to the appropriate type
// if (rxd.packet_class) {
//     const packetClass = rxd.packet_class as UnitTestRequest; // Cast to UnitTestRequest
//     console.log(new UnitTestResponse(packetClass.message));
// } else {
//     console.log('packet_class is null');
// }

// // Test WSCurrentWorkingBoxRequest
// const ss = new WSCurrentWorkingBoxRequest();
// ss.serial_number = "MOROW001";
// ss.current = new WSWorkingBox();
// ss.current.set("test", "barcode", 30, 80, 80, "pallet_location", "job_id", [0.0, 0.0, 0.0], [0.0, 0.0, 0.0]);
// ss.isLoading = false;
// ss.PalletType = "PalletType";
// ss.jobId = "JobId";
// ss.LoadingRate = 90.0;
// ss.LoadHeight = 80.0;
// ss.BoxPH = 0.0;

// const cwbTxd = ss.toJsonStr();
// console.log(cwbTxd);

// const cwbRxd = new WSCurrentWorkingBoxRequest();
// Object.assign(cwbRxd, JSON.parse(cwbTxd));
// cwbRxd.debug();

// // Test WSJobSettingInfoRequest
// const p1 = new WSJobPallet().set("orderGroup", "palletSpecName", [0, 0, 0], [],0, false, false,false, "location", "palletBarcode", "0","","");
// const box = new WSBox().set("box_name", [10, 20, 30]);

// const jsi = new WSJobSettingInfoRequest();
// jsi.serial_number = "MOROW001";
// jsi.aux_p1_jobID = "aux_p1_jobID";
// jsi.aux_p2_jobID = "aux_p2_jobID";
// jsi.p1_jobID = "p1_jobID";
// jsi.p2_jobID = "p2_jobID";
// jsi.pallets = [p1, p1];
// jsi.box_group_name = "box_group_name";
// jsi.boxes = [box, box];
// jsi.sender_id = "1";

// const jsiTxd = jsi.toJsonStr();
// console.log(jsiTxd);

// const jsiRxd = new WSJobSettingInfoRequest();
// Object.assign(jsiRxd, JSON.parse(jsiTxd));
// jsiRxd.debug();

// // Return the WSJobSettingInfoRequest instance
// return jsi; // Return the created WSJobSettingInfoRequest instance
// }

