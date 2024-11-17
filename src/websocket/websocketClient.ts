import WebSocket from 'ws';
import { WebPacket, WSBox, WSJobInfo, WSJobPallet, WSSuccessData, WSWorkingBox } from './utils/wsJsonFormat';
import { WSBarcodeCheckRequest, WSBarcodeCheckResponse, WSBarcodeCheckSrv, WSBasicAlarmRequest, WSBasicAlarmResponse, WSBasicAlarmSrv, WSButtonH2RMsg, WSCallJobRequest, WSCallJobResponse, WSCallJobSrv, WSCallPrevJobSrv, WSControlWordSrvRequest, WSCurrentWorkingBoxRequest, WSCurrentWorkingBoxResponse, WSCurrentWorkingBoxSrv, WSDeleteJobRequest, WSDeleteJobResponse, WSDeleteJobSrv, WSEmptyRequest, WSEventAlarmRequest, WSEventAlarmResponse, WSEventAlarmSrv, WSGetRobotInfoRequest, WSGetRobotInfoResponse, WSGetRobotInfoSrv, WSGripperConotrlSrv, WSGripperControlRequest, WSGripperControlResponse, WSJobInfoListCallEmptySrv, WSJobInfoListRequest, WSJobSettingInfoRequest, WSJobSettingInfoResponse, WSJobSettingInfoSrv, WSMorrowStatusWordSrv, WSSaveDbRequest, WSSaveDbResponse, WSSaveDbSrv, WSStatusWordMsg, WSSystemInfoRequest, WSSystemInfoResponse, WSSystemInfoSrv, WSSystemStatusRequest, WSSystemStatusResponse, WSSystemStatusSrv, WSTotalWorkingBoxesRequest, WSTotalWorkingBoxesResponse, WSTotalWorkingBoxesSrv, WSUpdateJobStatusRequest, WSUpdateJobStatusResponse, WSUpdateJobStatusSrv } from './utils/wsJsonExtendedFormat';

import express, { Router } from "express";
import {
    BOX_INSP_CD
} from "../constants/robotConstants";
import { hashSync } from "bcryptjs";
import { prisma } from "../utils/prisma";
import { updateJobInfo } from "../services/jobs.service";
import * as fs from 'fs';
import * as path from 'path';

const retry = require("async-retry");
const router: Router = express.Router();

class WebSocketClient {
    private ws: WebSocket | null = null;
    private url: string;
    private retryCount: number = 0;
    private readonly MAX_RETRIES: number = 500;
    private readonly RECONNECT_DELAY: number = 2000;
    private isReconnecting: boolean = false;

    constructor(url: string) {
        this.url = url;
        this.connect();
    }

    private connect() {
        this.ws = new WebSocket(this.url);
        console.log('WebSocket init! Attempt:', this.retryCount + 1);

        this.ws.on('open', () => {
            console.log('WebSocket Client Connected');
            this.retryCount = 0;
            this.isReconnecting = false;
            setTimeout(() => {
                this.robotInfoCall();
            }, 500); // Delay to allow the server to be ready
        });

        this.ws.on('message', (data: WebSocket.Data) => {
            console.log('WebPacket received:', data.toString());
            try {
                const jsonMessage = JSON.parse(data.toString());
                const webPacket = jsonMessage as WebPacket;
                this.handlePacket(webPacket);
            } catch (err) {
                console.error('Error parsing JSON data', err);
            }
        });

        this.ws.on('close', () => {
            console.log('WebSocket Client Disconnected');
            this.reconnect();
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket Error:', error);
            this.reconnect();
        });
    }

    private reconnect() {
        if (this.retryCount < this.MAX_RETRIES && !this.isReconnecting) {
            this.isReconnecting = true;
            this.retryCount++;
            console.log(`Reconnecting in ${this.RECONNECT_DELAY / 1000} seconds... (Attempt ${this.retryCount}/${this.MAX_RETRIES})`);

            setTimeout(() => {
                this.connect();
                this.isReconnecting = false;
            }, this.RECONNECT_DELAY);
        } else if (this.retryCount >= this.MAX_RETRIES) {
            console.error('Max retries reached. Connection failed.');
        }
    }

    private async handlePacket(packet: WebPacket) {
        switch (packet.packet_type) {
            case "request": // equivalent to nh.advertiseService!!!
                switch (packet.packet_name) {
                    case WSBarcodeCheckSrv._type:
                        const wSBarcodeCheckRequest = packet.packet_class as WSBarcodeCheckRequest
                        if (wSBarcodeCheckRequest !== null) {
                            await this.processBarcodeCheckReq(wSBarcodeCheckRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSBarcodeCheckRequest");
                        }
                        return;

                    case WSSystemInfoSrv._type:
                        const wSSystemInfoRequest = packet.packet_class as WSSystemInfoRequest;
                        if (wSSystemInfoRequest !== null) {
                            await this.processSystemInfoReq(wSSystemInfoRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSSystemInfoRequest");
                        }
                        return;

                    case WSSystemStatusSrv._type:
                        const wSSystemStatusRequest = packet.packet_class as WSSystemStatusRequest;
                        if (wSSystemStatusRequest !== null) {
                            await this.processSystemStatusReq(wSSystemStatusRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSSystemStatusRequest");
                        }
                        return;

                    case WSBasicAlarmSrv._type:
                        const wSBasicAlarmRequest = packet.packet_class as WSBasicAlarmRequest;
                        if (wSBasicAlarmRequest !== null) {
                            await this.processBasicAlarmReq(wSBasicAlarmRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSBasicAlarmRequest");
                        }
                        return;

                    case WSUpdateJobStatusSrv._type:
                        const wSUpdateJobStatusRequest = packet.packet_class as WSUpdateJobStatusRequest;
                        if (wSUpdateJobStatusRequest !== null) {
                            await this.processUpdateJobStatusReq(wSUpdateJobStatusRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSUpdateJobStatusSrv");
                        }
                        return;

                    case WSEventAlarmSrv._type:
                        const wSEventAlarmRequest = packet.packet_class as WSEventAlarmRequest;
                        if (wSEventAlarmRequest !== null) {
                            await this.processEventAlarmReq(wSEventAlarmRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSEventAlarmRequest");
                        }
                        return;

                    case WSSaveDbSrv._type:
                        const wSSaveDbRequest = packet.packet_class as WSSaveDbRequest;
                        if (wSSaveDbRequest != null) {
                            await this.processSaveDbReq(wSSaveDbRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSSaveDbRequest");
                        }
                        return;

                    case WSCurrentWorkingBoxSrv._type:
                        const wSCurrentWorkingBoxRequest = packet.packet_class as WSCurrentWorkingBoxRequest;
                        if (wSCurrentWorkingBoxRequest !== null) {
                            await this.processCurrentWorkingBoxReq(wSCurrentWorkingBoxRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSCurrentWorkingBoxRequest");
                        }
                        return;

                    case WSCallJobSrv._type:
                        const wSCallJobRequest = packet.packet_class as WSCallJobRequest;
                        if (wSCallJobRequest !== null) {
                            await this.processCallJobReq(wSCallJobRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSCallJobRequest");
                        }
                        return;

                    case WSCallPrevJobSrv._type:
                        const wSCallPrevJobRequest = packet.packet_class as WSCallJobRequest;
                        if (wSCallPrevJobRequest !== null) {
                            await this.processCallPrevJobReq(wSCallPrevJobRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSCallJobRequest");
                        }
                        return;

                    case WSDeleteJobSrv._type:
                        const wSDeleteJobRequest = packet.packet_class as WSDeleteJobRequest;
                        if (wSDeleteJobRequest !== null) {
                            await this.processDeleteJobJobReq(wSDeleteJobRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSCallJobRequest");
                        }
                        return;

                    case WSJobInfoListCallEmptySrv._type:
                        const wSEmptyRequest = packet.packet_class as WSEmptyRequest;
                        if (wSEmptyRequest !== null) {
                            await this.processJobInfoListCallEmptyReq(wSEmptyRequest);
                        } else {
                            console.error("Received packet_class is not an instance of WSJobInfoListCallEmptySrv");
                        }
                        return;

                    default:
                        console.warn("Unexpected request packet.packet_name: ", packet.packet_name);
                        return;
                }
                return;

            case "response":

                return;

            case "message": // equivalent to nh.subsribe!!!
                switch (packet.packet_name) {
                    case WSMorrowStatusWordSrv._type:
                        const word = packet.packet_class as WSStatusWordMsg;
                        console.log('Got msg on StatusWord: %j', word.name, word.num);
                        if (word !== null) {
                            this.processMorrowStatusWordMsg(word);
                        } else {
                            console.error("Received packet_class is not an instance of WSStatusWordMsg");
                        }
                        return;
                    default:
                        console.warn("Unexpected message packet.packet_name: ", packet.packet_name);
                        return;
                }

            default:
                // Do nothing or handle unexpected packet types
                console.warn("Unexpected packet type:", packet);
                return;
        }
    }

    private async processMorrowStatusWordMsg(word: WSStatusWordMsg) {
        const { name, num, serial_number } = word;
        // : DB Get Robot
        try {
            const findRobot = await prisma.robot.findUnique({
                where: {
                    serial: serial_number,
                },
            });
            // : DB Update Status
            if (findRobot && findRobot.status != num) {
                await retry(
                    async (bail: Error) => {
                        await prisma.robot.update({
                            where: {
                                serial: serial_number,
                            },
                            data: {
                                status: num
                            }
                        });
                    },
                    {
                        retries: 10,
                        factor: 1,
                        minTimeout: 100,
                        onRetry: (error: Error, attempt: number) => {
                            console.log('Attempt number', attempt, ' failed. Retrying...');
                        }
                    }
                );
            }
        }
        catch (err) {
            console.error("🚀 ~ file: robots.ts:155 ~ error on subscribe(/morow/statusword):", err);
        }
    }

    private async processJobInfoListCallEmptyReq(reqData: WSEmptyRequest) {
        await this.jobInfoListCall();
    }

    private async processDeleteJobJobReq(reqData: WSDeleteJobRequest) {
        const responseData = new WSDeleteJobResponse();
        let success = false;
        try {
            const findRobot = await prisma.robot.findUnique({
                where: {
                    serial: reqData.id,
                }
            });
            if (findRobot) {
                const morow_job = await prisma.job.findMany({
                    where: {
                        robotId: findRobot.id,
                    }
                });
                if (morow_job.length > 0) {
                    await prisma.job.deleteMany({
                        where: {
                            id: { in: morow_job.map((job: { id: any; }) => job.id) }
                        }
                    });
                }

                console.log("DeleteJob called")
                success = true;
            }
        }
        catch (error) {
            console.error(error);
        } finally {
            const responsePacket = new WebPacket();
            responseData.set(success)
            responsePacket.set(WSDeleteJobSrv._type, "response", responseData);

            // Send the response back to the ws server
            this.send(responsePacket.toJsonStr());
        }
    }

    async jobInfoListCall() {
        const jobInfoListReq = new WSJobInfoListRequest();

        try {
            jobInfoListReq.jobList = [];
            jobInfoListReq.count = 0
            const palletGroupList = await prisma.palletGroup.findMany();
            for (const palletGroup of palletGroupList) {
                const jobinfo = {
                    name: palletGroup.name,
                    location: palletGroup.location ?? ""
                } as WSJobInfo;

                jobInfoListReq.jobList.push(jobinfo);
                jobInfoListReq.count = jobInfoListReq.count + 1
            }
            console.log(jobInfoListReq);

            const reqPacket = new WebPacket();
            reqPacket.set("/morow/receiveJobInfo", "request", jobInfoListReq);

            //Send the reqPacket to the ws server
            this.send(reqPacket.toJsonStr());

            //Wait for response from ws server
            // this.ws.on('message', (data: WebSocket.Data) => {
            //     const jsonMessage = JSON.parse(data.toString());
            //     if (jsonMessage.packet_name === "/morow/receiveJobInfo" && jsonMessage.packet_type === "response") {
            //         console.log(`get response from server for /morow/receiveJobInfo req = ${jsonMessage} `)
            //     }
            // });
            return true;
        }
        catch (error) {
            console.error("JobInfoListCall Call Failed: ", error);
            return false;
        }
    }

    private async processCallPrevJobReq(reqData: WSCallJobRequest) {
        // DB에 log 입력
        // console.log(req.message_key); // time
        // 입력 완료 시 success 리턴
        const { serial_number } = reqData;
        const responseData = new WSCallJobResponse();
        let success = false;
        try {
            console.log("[CallPrevJobClient called]");
            await this.PreviousJobInfocall(serial_number);
            success = true;
        }
        catch (error) {
            console.error("🚀 ~ file: processCallPrevJobReq ~ error:", error);
            success = false;
        } finally {
            const responsePacket = new WebPacket();
            responseData.set(success)
            responsePacket.set(WSCallPrevJobSrv._type, "response", responseData);

            // Send the response back to the ws server
            this.send(responsePacket.toJsonStr());
        }
    }

    async PreviousJobInfocall(serial_number: string) {
        // console.log("[[[[[[[[[[[[[[[[[[[[[[[[[START]]]]]]]]]]]]]]]]]]]]]]]]]]]]]");
        const prevJobInfoReq = new WSTotalWorkingBoxesRequest();
        const success = false;
        try {
            const findRobot = await prisma.robot.findUnique({
                where: { serial: serial_number },
            });
            // console.log("[[[[[[[[[[[[[[[[[[[[[[[[[START]]]]]]]]]]]]]]]]]]]]]]]]]]]]]");
            if (findRobot) {
                const findJob_p1 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "좌측",
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    include: {
                        jobPallet: true,
                        JobGroup: true
                    }
                });
                const findJob_p2 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "우측",
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    include: {
                        jobPallet: true,
                    }
                });
                const findJob_aux_p1 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "보조(좌)",
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    include: {
                        jobPallet: true,
                    }
                });
                const findJob_aux_p2 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "보조(우)",
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    include: {
                        jobPallet: true,
                    }
                });
                if (findJob_p1 && findJob_p2 && findJob_aux_p1 && findJob_aux_p2) {
                    // console.log("============================================");
                    const countId_p1 = await prisma.boxPosition.groupBy({
                        by: 'boxId',
                        where: {
                            jobId: findJob_p1.id,
                        },
                        _count: {
                            boxId: true,
                        }
                    });
                    let boxIdList_p1: string[] = [];
                    for (const query of countId_p1) {
                        if (query._count.boxId % 2 == 1) {
                            if (query.boxId) {
                                boxIdList_p1.push(query.boxId);
                            }
                        }
                    }
                    const jobboxp1 = await prisma.boxPosition.findMany({
                        where: {
                            jobId: findJob_p1.id,
                            boxId: {
                                in: boxIdList_p1,
                            },
                        },
                        orderBy: {
                            loadingOrder: "desc",
                        },
                        distinct: ['boxId'],
                    });
                    const countId_p2 = await prisma.boxPosition.groupBy({
                        by: 'boxId',
                        where: {
                            jobId: findJob_p2.id,
                        },
                        _count: {
                            boxId: true,
                        }
                    });
                    let boxIdList_p2: string[] = [];
                    for (const query of countId_p2) {
                        if (query._count.boxId % 2 == 1) {
                            if (query.boxId) {
                                boxIdList_p2.push(query.boxId);
                            }
                        }
                    }
                    const jobboxp2 = await prisma.boxPosition.findMany({
                        where: {
                            jobId: findJob_p2.id,
                            boxId: {
                                in: boxIdList_p2,
                            },
                        },
                        orderBy: {
                            loadingOrder: "desc",
                        },
                        distinct: ['boxId'],
                    });
                    const countId_aux_p1 = await prisma.boxPosition.groupBy({
                        by: 'boxId',
                        where: {
                            jobId: findJob_aux_p1.id,
                        },
                        _count: {
                            boxId: true,
                        }
                    });
                    let boxIdList_aux_p1: string[] = [];
                    for (const query of countId_aux_p1) {
                        if (query._count.boxId % 2 == 1) {
                            if (query.boxId) {
                                boxIdList_aux_p1.push(query.boxId);
                            }
                        }
                    }
                    const jobbox_aux_p1 = await prisma.boxPosition.findMany({
                        where: {
                            jobId: findJob_aux_p1.id,
                            boxId: {
                                in: boxIdList_aux_p1,
                            },
                        },
                        orderBy: {
                            loadingOrder: "desc",
                        },
                        distinct: ['boxId'],
                    });
                    const countId_aux_p2 = await prisma.boxPosition.groupBy({
                        by: 'boxId',
                        where: {
                            jobId: findJob_aux_p2.id,
                        },
                        _count: {
                            boxId: true,
                        }
                    });
                    let boxIdList_aux_p2: string[] = [];
                    for (const query of countId_aux_p2) {
                        if (query._count.boxId % 2 == 1) {
                            if (query.boxId) {
                                boxIdList_aux_p2.push(query.boxId);
                            }
                        }
                    }
                    const jobbox_aux_p2 = await prisma.boxPosition.findMany({
                        where: {
                            jobId: findJob_aux_p2.id,
                            boxId: {
                                in: boxIdList_aux_p2,
                            },
                        },
                        orderBy: {
                            loadingOrder: "desc",
                        },
                        distinct: ['boxId'],
                    });

                    prevJobInfoReq.serial_number = serial_number;
                    prevJobInfoReq.name = findJob_p1.JobGroup.name;
                    prevJobInfoReq.location = findJob_p1.JobGroup.location || "";

                    prevJobInfoReq.p1_box_list = [];
                    for (const box of jobboxp1.reverse()) {
                        const workingBox = new WSWorkingBox();
                        workingBox.name = box.boxName;
                        workingBox.box_id = this.convertToNumber(box.boxId) || -1;
                        workingBox.barcode = box.boxBarcode;
                        workingBox.loading_order = box.loadingOrder;
                        workingBox.rotation_type = box.rotationType || 0;
                        workingBox.pallet_location = "p1";
                        workingBox.job_id = box.jobId.toString();
                        workingBox.position = [box.x, box.y, box.z];
                        workingBox.length = [box.length, box.width, box.height];

                        prevJobInfoReq.p1_box_list.push(workingBox);
                    }

                    prevJobInfoReq.p2_box_list = [];
                    for (const box of jobboxp2.reverse()) {
                        const workingBox = new WSWorkingBox();
                        workingBox.name = box.boxName;
                        workingBox.box_id = this.convertToNumber(box.boxId) || -1;
                        workingBox.barcode = box.boxBarcode;
                        workingBox.loading_order = box.loadingOrder;
                        workingBox.rotation_type = box.rotationType || 0;
                        workingBox.pallet_location = "p2";
                        workingBox.job_id = box.jobId.toString();
                        workingBox.position = [box.x, box.y, box.z];
                        workingBox.length = [box.length, box.width, box.height];

                        prevJobInfoReq.p2_box_list.push(workingBox);
                    }

                    prevJobInfoReq.aux_p1_box_list = [];
                    for (const box of jobbox_aux_p1.reverse()) {
                        const workingBox = new WSWorkingBox();
                        workingBox.name = box.boxName;
                        workingBox.box_id = this.convertToNumber(box.boxId) || -1;
                        workingBox.barcode = box.boxBarcode;
                        workingBox.loading_order = box.loadingOrder;
                        workingBox.rotation_type = box.rotationType || 0;
                        workingBox.pallet_location = "aux_p1";
                        workingBox.job_id = box.jobId.toString();
                        workingBox.position = [box.x, box.y, box.z];
                        workingBox.length = [box.length, box.width, box.height];

                        prevJobInfoReq.aux_p1_box_list.push(workingBox);
                    }

                    prevJobInfoReq.aux_p2_box_list = [];
                    for (const box of jobbox_aux_p2.reverse()) {
                        const workingBox = new WSWorkingBox();
                        workingBox.name = box.boxName;
                        workingBox.box_id = this.convertToNumber(box.boxId) || -1;
                        workingBox.barcode = box.boxBarcode;
                        workingBox.loading_order = box.loadingOrder;
                        workingBox.rotation_type = box.rotationType || 0;
                        workingBox.pallet_location = "aux_p2";
                        workingBox.job_id = box.jobId.toString();
                        workingBox.position = [box.x, box.y, box.z];
                        workingBox.length = [box.length, box.width, box.height];

                        prevJobInfoReq.aux_p2_box_list.push(workingBox);
                    }

                    const reqPacket = new WebPacket();
                    reqPacket.set("/cmp_UI/PreviousJobInfo", "request", prevJobInfoReq);

                    //Send the reqPacket to the ws server
                    this.send(reqPacket.toJsonStr());

                    // wait for 1000ms for response from server
                    const responsePromise = new Promise<WSTotalWorkingBoxesResponse>((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error("Timeout: No response within 1000ms"));
                        }, 10000);

                        this.ws?.on('message', (data: WebSocket.Data) => {
                            const jsonMessage = JSON.parse(data.toString());
                            if (jsonMessage.packet_name === WSTotalWorkingBoxesSrv._type && jsonMessage.packet_type === "response") {
                                clearTimeout(timeout);
                                resolve(jsonMessage.packet_class as WSTotalWorkingBoxesResponse);
                            }
                        });
                    });
                    let resp = await responsePromise;
                    console.log(`Receive repsponse from WSTotalWorkingBoxesSrv: ${resp}`)
                }
            }
            return true;
        }
        catch (error) {
            console.error("rejected:", error)
            return false;
        }
    };

    async CJJobInfocall(serial_number: string) {
        // console.log("[[[[[[[[[[[[[[[[[[[[[[[[[START]]]]]]]]]]]]]]]]]]]]]]]]]]]]]");
        const prevJobInfoReq = new WSTotalWorkingBoxesRequest();
        try {
            const findRobot = await prisma.robot.findUnique({
                where: { serial: serial_number },
            });
            // console.log("[[[[[[[[[[[[[[[[[[[[[[[[[START]]]]]]]]]]]]]]]]]]]]]]]]]]]]]");
            if (findRobot) {
                prevJobInfoReq.serial_number = serial_number;
                prevJobInfoReq.p1_box_list = [];
                prevJobInfoReq.p2_box_list = [];

                const reqPacket = new WebPacket();
                reqPacket.set("/cmp_UI/PreviousJobInfo", "request", prevJobInfoReq);

                //Send the reqPacket to the ws server
                this.send(reqPacket.toJsonStr());

                // wait for 1000ms for response from server
                const responsePromise = new Promise<WSTotalWorkingBoxesResponse>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error("Timeout: No response within 1000ms"));
                    }, 10000);

                    this.ws?.on('message', (data: WebSocket.Data) => {
                        const jsonMessage = JSON.parse(data.toString());
                        if (jsonMessage.packet_name === WSTotalWorkingBoxesSrv._type && jsonMessage.packet_type === "response") {
                            clearTimeout(timeout);
                            resolve(jsonMessage.packet_class as WSTotalWorkingBoxesResponse);
                        }
                    });
                });
                let resp = await responsePromise;
                console.log(`Receive repsponse from WSTotalWorkingBoxesSrv: ${resp}`)
            }
            return true;
        }
        catch (error) {
            console.error("rejected:", error)
            return false;
        }
    };

    private async processCallJobReq(reqData: WSCallJobRequest) {
        // DB에 log 입력
        // console.log(req.message_key); // time
        // 입력 완료 시 success 리턴
        const { serial_number, sender_id } = reqData;
        const responseData = new WSCallJobResponse();
        let success = false
        try {
            const result = (await this.sendPrevJobInfo(serial_number, sender_id));
            success = result;
        }
        catch (error) {
            console.error("🚀 ~ processCallJobReq ~ error:", error);
        } finally {
            const responsePacket = new WebPacket();
            responseData.set(success)
            responsePacket.set(WSCallJobSrv._type, "response", responseData);

            // Send the response back to the ws server
            this.send(responsePacket.toJsonStr());
        }
    }

    async sendPrevJobInfo(serial_number: string, sender_id: string) {
        const jobSettingInfoReq = new WSJobSettingInfoRequest();
        const success = false;
        try {
            const findRobot = await prisma.robot.findUnique({
                where: {
                    serial: serial_number,
                },
            });
            if (findRobot) {
                const findJob_p1 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            // isBuffer: false,
                            location: "좌측"
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    include: {
                        JobGroup: true,
                        jobPallet: true,
                    }
                });
                const findJob_p2 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "우측",
                            // isBuffer: true,
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    include: { JobGroup: true }
                });
                const findJob_aux_p1 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "보조(좌)",
                            // isBuffer: true,
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    include: { JobGroup: true }
                });
                const findJob_aux_p2 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "보조(우)",
                            // isBuffer: true,
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                    include: { JobGroup: true }
                });
                if (findJob_p1 && findJob_p2 && findJob_aux_p1 && findJob_aux_p2) {
                    const findJobPallet1 = await prisma.jobPallet.findUnique({
                        where: { jobId: findJob_p1.id },
                        // include: { job: true },
                    });
                    const findJobPallet2 = await prisma.jobPallet.findUnique({
                        where: { jobId: findJob_p2.id },
                    });
                    const findJobPallet_aux_p1 = await prisma.jobPallet.findUnique({
                        where: { jobId: findJob_aux_p1.id },
                    });
                    const findJobPallet_aux_p2 = await prisma.jobPallet.findUnique({
                        where: { jobId: findJob_aux_p2.id },
                    });
                    console.log(findJob_p1.jobBoxes);
                    // const defaultBoxList = '[{"name":"DEFAULT","width":0,"height":0,"length":0,"weight":0,"labelDirection":0,"jobId":0}]';
                    const defaultBoxList = [{}];

                    const findBox = JSON.parse(findJob_p1.jobBoxes);
                    const p1BoxList = findJob_p1.jobBoxes ? JSON.parse(findJob_p1.jobBoxes) : defaultBoxList;
                    const p2BoxList = findJob_p2.jobBoxes ? JSON.parse(findJob_p2.jobBoxes) : defaultBoxList;
                    const auxp1BoxList = findJob_aux_p1.jobBoxes ? JSON.parse(findJob_aux_p1.jobBoxes) : defaultBoxList;
                    const auxp2BoxList = findJob_aux_p2.jobBoxes ? JSON.parse(findJob_aux_p2.jobBoxes) : defaultBoxList;
                    jobSettingInfoReq.p1_jobID = findJob_p1.id.toString();
                    jobSettingInfoReq.p2_jobID = findJob_p2.id.toString();
                    jobSettingInfoReq.aux_p1_jobID = findJob_aux_p1.id.toString();
                    jobSettingInfoReq.aux_p2_jobID = findJob_aux_p2.id.toString();
                    const pallets = [findJobPallet1, findJobPallet2, findJobPallet_aux_p1, findJobPallet_aux_p2];
                    const boxes = findBox;
                    const pallets_req: WSJobPallet[] = [];
                    const boxes_req: WSBox[] = [];
                    console.log("PALLETS: ", pallets[0]);
                    console.log("BOXES: ", boxes[0]);
                    // console.log(new JobPallet());
                    let input_pallet = [];
                    for (const pallet of pallets) {
                        if (true) {//(pallet.isUse){
                            const jobBoxes_req: WSBox[] = [];
                            let pallet_location = "";
                            let chuteNo = "";
                            let orderGroup = "";
                            let palletBarcode = "";
                            let palletSpecName = "";
                            let jobBoxList = [];
                            if (pallet?.location == "좌측") {
                                pallet_location = "p1";
                                if (findJob_p1.JobGroup.location) {
                                    chuteNo = findJob_p1.JobGroup.location;
                                }
                                orderGroup = findJob_p1.JobGroup.name;
                                palletBarcode = pallet.palletBarcode;
                                palletSpecName = pallet.palletSpecName;
                                jobBoxList = p1BoxList;
                            }
                            else if (pallet?.location == "우측") {
                                pallet_location = "p2";
                                if (findJob_p2.JobGroup.location) {
                                    chuteNo = findJob_p2.JobGroup.location;
                                }
                                orderGroup = findJob_p2.JobGroup.name;
                                palletBarcode = pallet.palletBarcode;
                                palletSpecName = pallet.palletSpecName;
                                jobBoxList = p2BoxList;
                            }
                            else if (pallet?.location == "보조(좌)") {
                                orderGroup = findJob_aux_p1.JobGroup.name;
                                pallet_location = "aux_p1";
                                jobBoxList = auxp1BoxList;
                            }
                            else if (pallet?.location == "보조(우)") {
                                orderGroup = findJob_aux_p2.JobGroup.name;
                                pallet_location = "aux_p2";
                                jobBoxList = auxp2BoxList;
                            }
                            // const pallet_req = morowMsgs.msg.JobPallet;
                            const palletLength = pallet?.["length"] || 0;
                            console.log("PalletLength: ", palletLength);
                            for (const box of jobBoxList) {
                                const jobbox_req = new WSBox();
                                jobbox_req.set(box.name.toUpperCase(), [box["length"], box.width, box.height]);
                                jobBoxes_req.push(jobbox_req);
                            }
                            const pallet_req = new WSJobPallet();
                            pallet_req.set(orderGroup,
                                palletSpecName,
                                [palletLength, pallet?.width || 0, pallet?.height || 0],
                                jobBoxes_req,
                                pallet?.loadingHeight || 0,
                                pallet?.isBuffer || false,
                                pallet?.isError || false,
                                pallet?.isUse || false,
                                pallet_location,
                                palletBarcode,
                                chuteNo,
                                pallet?.loadingPatternName,
                                pallet?.boxGroupName
                            )
                            pallets_req.push(pallet_req);
                        }
                    }
                    for (const box of boxes) {
                        const box_req = new WSBox();
                        box_req.name = box.name.toUpperCase();
                        box_req.size = [box["length"], box.width, box.height];
                        boxes_req.push(box_req);
                    }
                    console.log("[PALLETS_REQ] ", pallets_req);
                    console.log("[BOXES] ", boxes_req);
                    jobSettingInfoReq.pallets = pallets_req;
                    jobSettingInfoReq.boxes = boxes_req;
                    jobSettingInfoReq.box_group_name = findJob_p1.jobPallet?.boxGroupName || "";
                    jobSettingInfoReq.serial_number = serial_number;
                    jobSettingInfoReq.sender_id = sender_id;
                    // add enableConcurrent
                    jobSettingInfoReq.enable_concurrent = findJob_p1.JobGroup.enableConcurrent;
                    console.log("====================================================");
                    console.log("[JOBSETTINGINFOREQ]START");
                    console.log(jobSettingInfoReq);
                    console.log("0", jobSettingInfoReq.pallets[0].jobBoxes);
                    console.log("1", jobSettingInfoReq.pallets[1].jobBoxes);
                    console.log("2", jobSettingInfoReq.pallets[2].jobBoxes);
                    console.log("3", jobSettingInfoReq.pallets[3].jobBoxes);

                    console.log("[JOBSETTINGINFOCALL]");
                    const reqPacket = new WebPacket();
                    reqPacket.set("/cmp_UI/JobSettingInfo", "request", jobSettingInfoReq);

                    //Send the reqPacket to the ws server
                    this.send(reqPacket.toJsonStr());

                    // wait for 1000ms for response from server
                    const responsePromise = new Promise<WSJobSettingInfoResponse>((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error("Timeout: No response within 1000ms"));
                        }, 10000);

                        this.ws?.on('message', (data: WebSocket.Data) => {
                            const jsonMessage = JSON.parse(data.toString());
                            if (jsonMessage.packet_name === WSJobSettingInfoSrv._type && jsonMessage.packet_type === "response") {
                                clearTimeout(timeout);
                                resolve(jsonMessage.packet_class as WSJobSettingInfoResponse);
                            }
                        });
                    });

                    let resp = await responsePromise;
                    console.log("[JOBSETTINGINFOCALL]", resp);
                    return true;
                }
                else {
                    console.error("findJob_p1 && findJob_p2 && findJob_aux_p1 && findJob_aux_p2 returned false");
                    return false;
                }
            }
            else {
                console.error("Robot with the serial_number doesn't exist");
                return false;
            }
        } catch (error) {
            console.error("rejected:", error);
            return false;
        }
    };

    async sendCJJobInfo(serial_number: string, sender_id: string) {
        try {
            const pallets: WSJobPallet[] = [];
            const boxes: WSBox[] = [];

            let cj_p1_pallet = new WSJobPallet();
            cj_p1_pallet.orderGroup = "CJ";
            cj_p1_pallet.palletSpecName = "11A";
            cj_p1_pallet.size = [1200, 1000, 150];
            cj_p1_pallet.loadingHeight = 1450;
            cj_p1_pallet.isBuffer = false;
            cj_p1_pallet.location = "좌측";
            cj_p1_pallet.palletBarcode = "CJ_P1_BARCODE";
            cj_p1_pallet.chuteNo = "777";

            let cj_p2_pallet = new WSJobPallet();
            cj_p2_pallet.orderGroup = "CJ";
            cj_p2_pallet.palletSpecName = "11A";
            cj_p2_pallet.size = [1200, 1000, 150];
            cj_p2_pallet.loadingHeight = 1450;
            cj_p2_pallet.isBuffer = false;
            cj_p2_pallet.location = "우측";
            cj_p2_pallet.palletBarcode = "CJ_P2_BARCODE";
            cj_p2_pallet.chuteNo = "777";

            pallets.push(cj_p1_pallet);
            pallets.push(cj_p2_pallet);

            let cj_box_B = new WSBox();
            let cj_box_C = new WSBox();
            let cj_box_D = new WSBox();
            let cj_box_F = new WSBox();
            let cj_box_G = new WSBox();
            let cj_box_H = new WSBox();
            let cj_box_I = new WSBox();

            cj_box_B.name = "B"
            cj_box_B.size = [195, 178, 134];
            cj_box_C.name = "C"
            cj_box_C.size = [245, 178, 140];
            cj_box_D.name = "D"
            cj_box_D.size = [245, 220, 158];
            cj_box_F.name = "F"
            cj_box_F.size = [310, 233, 210];
            cj_box_G.name = "G"
            cj_box_G.size = [315, 272, 257];
            cj_box_H.name = "H"
            cj_box_H.size = [391, 246, 308];
            cj_box_I.name = "I"
            cj_box_I.size = [410, 356, 312];

            boxes.push(cj_box_B);
            boxes.push(cj_box_C);
            boxes.push(cj_box_D);
            boxes.push(cj_box_F);
            boxes.push(cj_box_G);
            boxes.push(cj_box_H);
            boxes.push(cj_box_I);

            const jobSettingInfoReq = new WSJobSettingInfoRequest();
            jobSettingInfoReq.pallets = pallets;
            jobSettingInfoReq.boxes = boxes;
            jobSettingInfoReq.serial_number = serial_number;
            jobSettingInfoReq.sender_id = sender_id;

            const reqPacket = new WebPacket();
            reqPacket.set("/cmp_UI/JobSettingInfo", "request", jobSettingInfoReq);

            //Send the reqPacket to the ws server
            this.send(reqPacket.toJsonStr());

            // wait for 1000ms for response from server
            const responsePromise = new Promise<WSJobSettingInfoResponse>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout: No response within 1000ms"));
                }, 10000);

                this.ws?.on('message', (data: WebSocket.Data) => {
                    const jsonMessage = JSON.parse(data.toString());
                    if (jsonMessage.packet_name === WSJobSettingInfoSrv._type && jsonMessage.packet_type === "response") {
                        clearTimeout(timeout);
                        resolve(jsonMessage.packet_class as WSJobSettingInfoResponse);
                    }
                });
            });

            let resp = await responsePromise;
            return true;
        } catch (error) {
            console.error("rejected:", error);
            return false;
        }
    };

    private async processCurrentWorkingBoxReq(reqData: WSCurrentWorkingBoxRequest) {
        const responseData = new WSCurrentWorkingBoxResponse();
        const { current, isLoading, PalletType } = reqData;
        let success = false
        if (current !== null) {
            const workingbox: WSWorkingBox = current;
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
            } = current;
            console.log("cmp_UI/CurrnetWorkingBox: ", workingbox);

            try {
                const findRobots = await prisma.robot.findMany();
                const findRobot = findRobots[0];
                const serial_number = findRobot.serial;

                if (findRobot) {
                    let findJob;
                    if (pallet_location == "좌측" || pallet_location == "p1") {
                        findJob = await prisma.job.findFirst({
                            where: {
                                robotId: findRobot.id,
                                endFlag: false,
                                jobPallet: {
                                    // isBuffer: false,
                                    location: "좌측"
                                },
                            },
                            orderBy: {
                                id: "desc",
                            },
                            include: {
                                JobGroup: true,
                                jobPallet: true,
                            }
                        });
                    } else if (pallet_location == "우측" || pallet_location == "p2") { //PalletType =="Buffer"
                        findJob = await prisma.job.findFirst({
                            where: {
                                robotId: findRobot.id,
                                endFlag: false,
                                jobPallet: {
                                    // isBuffer: true,
                                    location: "우측"
                                },
                            },
                            orderBy: {
                                id: "desc",
                            },
                            include: {
                                JobGroup: true,
                                jobPallet: true,
                            }
                        });
                    }
                    else if (pallet_location == "보조(좌)" || pallet_location == "aux_p1") { //PalletType =="Buffer"
                        findJob = await prisma.job.findFirst({
                            where: {
                                robotId: findRobot.id,
                                endFlag: false,
                                jobPallet: {
                                    // isBuffer: true,
                                    location: "보조(좌)"
                                },
                            },
                            orderBy: {
                                id: "desc",
                            },
                            include: {
                                JobGroup: true,
                                jobPallet: true,
                            }
                        });
                    }
                    else if (pallet_location == "보조(우)" || pallet_location == "aux_p2") { //PalletType =="Buffer"
                        // console.log("in 우측");
                        findJob = await prisma.job.findFirst({
                            where: {
                                robotId: findRobot.id,
                                endFlag: false,
                                jobPallet: {
                                    // isBuffer: true,
                                    location: "보조(우)"
                                },
                            },
                            orderBy: {
                                id: "desc",
                            },
                            include: {
                                JobGroup: true,
                                jobPallet: true,
                            }
                        });
                    }
                    else {
                        console.error("Error: pallet_location is not valid");
                    }
                    if (findJob) {
                        const lastBox = await prisma.boxPosition.findFirst({
                            where: {
                                jobId: findJob.id,
                            },
                            orderBy: {
                                loadingOrder: "desc",
                            },
                        });
                        let ghostid = -1;
                        let cur_box_id;
                        if (name == 'ghost') {
                            const lastGhostBox = await prisma.boxPosition.findFirst({
                                where: {
                                    jobId: findJob.id,
                                    boxName: "ghost",
                                },
                                orderBy: {
                                    loadingOrder: "desc",
                                }
                            })
                            if (lastGhostBox && lastGhostBox.boxId) {
                                ghostid = parseInt(lastGhostBox.boxId) - 1;
                            }
                            cur_box_id = ghostid.toString();
                        }
                        else {
                            cur_box_id = box_id.toString();
                        }
                        let curLoadingOrder = 1;
                        if (lastBox) {
                            curLoadingOrder = lastBox.loadingOrder + 1;
                        }
                        const currentJobPallet = await prisma.jobPallet.findFirst({
                            where: {
                                jobId: findJob.id,
                            },
                        });
                        if (findJob?.JobGroup?.location != null && currentJobPallet != null && currentJobPallet.palletBarcode != null && (currentJobPallet.location == "좌측" || currentJobPallet.location == "우측")) {
                            this.sendPostRequest(barcode, false, currentJobPallet.palletBarcode, findJob?.JobGroup?.location, serial_number);
                        }
                        const addbox = await prisma.boxPosition.create({
                            data: {
                                jobId: findJob.id,
                                boxId: cur_box_id,
                                x: position?.[0] ?? 0,
                                y: position?.[1] ?? 0,
                                z: position?.[2] ?? 0,
                                length: length?.[0] ?? 0,// lx
                                width: length?.[1] ?? 0, //ly
                                height: length?.[2] ?? 0, //lz
                                boxName: name,
                                boxBarcode: findRobot.isUseBarcode ? barcode : this.generateUniqueTimestamp(),
                                //TODO: 추후
                                loadingOrder: curLoadingOrder,
                                rotationType: rotation_type,
                                isLoading: isLoading
                                // robot serial로 robot id 검색
                            }
                        });
                        updateJobInfo(findJob.id);
                        success = true;
                    }
                }
            } catch (error) {
                console.error("🚀 ~ file: robots.ts:346 ~ error:", error);
            }
        }
        const responsePacket = new WebPacket();
        responseData.set(success)
        responsePacket.set(WSCurrentWorkingBoxSrv._type, "response", responseData);

        // Send the response back to the ws server
        this.send(responsePacket.toJsonStr());
    }

    private generateUniqueTimestamp(): string {
        const now = new Date();

        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month is zero-indexed, so add 1
        const day = now.getDate().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        // Generate three random digits
        const randomDigits = Math.floor(100 + Math.random() * 900).toString(); // Ensures it's a 3-digit number

        // Combine to form the string: yyyymmddss + 3 random digits
        return `${year}${month}${day}${seconds}${randomDigits}`;
    }

    private sendPostRequest = async (WH_CD: string, PALLET_NO: boolean, HAWB_NO = "", DECONSOL = "", WORKERID = "", ARR_PORT = "", serial_number = "") => {
        const findRobot = await prisma.robot.findUnique({
            where: { serial: serial_number },
        });
        if (!findRobot) {
            console.error(`Cannot find robot with serial_number ${serial_number}`);
            return;
        }
        const inexData = JSON.stringify({
            WH_CD: WH_CD,
            PALLET_NO: PALLET_NO,
            HAWB_NO: HAWB_NO,
            DECONSOL: DECONSOL,
            WORKERID: WORKERID,
            ARR_PORT: ARR_PORT
        });
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': '4364a2343c0640ef6a9c275f57832cd663e4f4a025c35c4e0711865cb4b1952e',
                'sessionUser': 'QF75tS/6dGyIyzpgcrNdXgwH',
                'Cookie': 'JSESSIONID=axQpXe11vjLQmgaEcrat1i4bBwpPN9urWn1q4OpTXiMuaemvzzMLgPbscHvGxf1E.kxdevwas1_servlet_ecomora'
            },
            body: inexData
        };
        const sendRequestInternal = async () => {
            try {
                const findRobot = await prisma.robot.findUnique({
                    where: { serial: serial_number },
                });
                const targetURL = findRobot?.extConnectionUrl;
                if (!targetURL) {
                    console.error(`External Connection URL not found for robot with serial number ${serial_number}`);
                    return;
                }
                console.log("[TARGET URL]", targetURL);
                console.log("[DATA]: ", inexData);
                try {
                    const response = await fetch(targetURL, requestOptions);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}, body: ${response}, data: ${response.statusText}`);

                        return false;
                    } else {
                        try {
                            const data = await response.json();
                            console.log("[RECEIVED FROM INEX: ", data);
                        } catch (error) {
                            if (error instanceof Error) {
                                throw new Error('Failed to parse JSON response: ' + error.message);
                            } else {
                                throw new Error('Failed to parse JSON response: ' + JSON.stringify(error));
                            }
                        }
                    }
                }
                catch (error) {
                    console.warn("ERROR: ", error);
                }
            } catch (error) {
                if (error instanceof Error) {
                    console.error('Fetch request failed:', error.message);
                } else {
                    console.error('Fetch request failed:', JSON.stringify(error));
                }
                const findRobot = await prisma.robot.findUnique({
                    where: { serial: serial_number },
                });
            }
        };
        if (!findRobot.enableExtConnection || (findRobot.platform != "CBR2PAL" && findRobot.platform != "CHRIS2")) {
            if (!findRobot.enableExtConnection) {
                return;
                console.log(`Ext Connection is set to false for robot with serial number: ${serial_number}`);
            }
            else {
                console.log(`Robot Platform is set to ${findRobot.platform}. `);
            }
            console.log("UI will not send Post Request.")
            return;
        }
        else {
            console.time("[Send Request Interval]");
            sendRequestInternal();
            console.timeEnd("[Send Request Interval]");
        }
        return true;
    };

    private async processSaveDbReq(reqData: WSSaveDbRequest) {
        const { serial_number } = reqData;
        const responseData = new WSSaveDbResponse();
        try {
            const findRobot = await prisma.robot.findUnique({
                where: { serial: serial_number },
            });
            if (findRobot) {
                const findJob_p1 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "좌측",
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                });
                const findJob_p2 = await prisma.job.findFirst({
                    where: {
                        robotId: findRobot.id,
                        endFlag: false,
                        jobPallet: {
                            location: "우측",
                        },
                    },
                    orderBy: {
                        updatedAt: "desc",
                    },
                });
                if (findJob_p1 && findJob_p2) {
                    const countId_p1 = await prisma.boxPosition.groupBy({
                        by: 'boxId',
                        where: {
                            jobId: findJob_p1.id,
                        },
                        _count: {
                            boxId: true,
                        }
                    });
                    let boxIdList_p1: string[] = [];
                    for (const query of countId_p1) {
                        if (query._count.boxId % 2 == 1) {
                            if (query.boxId) {
                                boxIdList_p1.push(query.boxId);
                            }
                        }
                    }
                    const jobboxp1 = await prisma.boxPosition.findMany({
                        where: {
                            jobId: findJob_p1.id,
                            boxId: {
                                in: boxIdList_p1,
                            },
                        },
                        orderBy: {
                            loadingOrder: "desc",
                        },
                        distinct: ['boxId'],
                    });
                    const countId_p2 = await prisma.boxPosition.groupBy({
                        by: 'boxId',
                        where: {
                            jobId: findJob_p2.id,
                        },
                        _count: {
                            boxId: true,
                        }
                    });
                    let boxIdList_p2: string[] = [];
                    for (const query of countId_p2) {
                        if (query._count.boxId % 2 == 1) {
                            if (query.boxId) {
                                boxIdList_p2.push(query.boxId);
                            }
                        }
                    }
                    const jobboxp2 = await prisma.boxPosition.findMany({
                        where: {
                            jobId: findJob_p2.id,
                            boxId: {
                                in: boxIdList_p2,
                            },
                        },
                        orderBy: {
                            loadingOrder: "desc",
                        },
                        distinct: ['boxId'],
                    });
                    for (const box of jobboxp1.reverse()) {
                        const workingBox = new WSWorkingBox();
                        workingBox.set(box.boxName,
                            box.boxBarcode,
                            this.convertToNumber(box.boxId),
                            box.loadingOrder,
                            box.rotationType ?? undefined,
                            "p1",
                            box.jobId.toString(),
                            [box.x, box.y, box.z],
                            [box.length, box.width, box.height])
                        responseData.p1_box_list.push(workingBox)
                    }
                    for (const box of jobboxp2.reverse()) {
                        const workingBox = new WSWorkingBox();
                        workingBox.set(box.boxName,
                            box.boxBarcode,
                            this.convertToNumber(box.boxId),
                            box.loadingOrder,
                            box.rotationType ?? undefined,
                            "p2",
                            box.jobId.toString(),
                            [box.x, box.y, box.z],
                            [box.length, box.width, box.height])
                        responseData.p2_box_list.push(workingBox)
                    }
                    responseData.success = true;
                    console.log("[CALLING SaveDB server from UI]")
                    console.log(responseData)
                }
            }
        }
        catch (error) {
            console.error("rejected:", error)
            responseData.success = false;
        } finally {
            const responseData = new WSSaveDbResponse();
            const responsePacket = new WebPacket();
            responsePacket.set(WSSaveDbSrv._type, "response", responseData);

            // Send the response back to the ws server
            this.send(responsePacket.toJsonStr());
        }
    }

    private async processEventAlarmReq(reqData: WSEventAlarmRequest) {
        // DB에 log 입력
        console.log("[CMP_UI] EVENTALARM 발생")
        console.log(reqData); // time
        // 입력 완료 시 success 리턴
        const { serial_number, message_key } = reqData;
        let success = false
        try {
            const findRobot = await prisma.robot.findUnique({
                where: { serial: serial_number },
            });
            if (findRobot) {
                await retry(
                    async (bail: Error) => {
                        await prisma.robot.update({
                            where: { serial: serial_number },
                            data: { eventAlarmCode: message_key },
                        });
                    },
                    {
                        retries: 10,
                        factor: 1,
                        minTimeout: 100,
                        onRetry: (error: Error, attempt: number) => {
                            console.log('Attempt number', attempt, ' failed. Retrying request: cmp_UI/EventAlarm: robot.update');
                        }
                    }
                );
            }
            success = true;
        } catch (error) {
            console.error("🚀 ~ file: robots.ts:370 ~ error:", error);
            success = false;
        } finally {
            const responseData = new WSEventAlarmResponse();
            responseData.set(success);
            const responsePacket = new WebPacket();
            responsePacket.set(WSEventAlarmSrv._type, "response", responseData);

            // Send the response back to the ws server
            this.send(responsePacket.toJsonStr());
        }
    }

    private async processUpdateJobStatusReq(reqData: WSUpdateJobStatusRequest) {
        const { serial_number, LoadingRate, LoadHeight, BPH, pallet_location } = reqData;
        let success = false;
        if (LoadingRate == 0 && LoadHeight == 0 && BPH == 0) {
            return;
        }
        else {
            try {
                const findRobot = await prisma.robot.findUnique({
                    where: { serial: serial_number },
                });
                let cur_pallet_loc = '';
                if (pallet_location == "p1" || pallet_location == "좌측") { cur_pallet_loc = "좌측" }
                else if (pallet_location == "p2" || pallet_location == "우측") { cur_pallet_loc = "우측" }
                else if (pallet_location == "aux_p1" || pallet_location == "보조(좌)") { cur_pallet_loc = "보조(좌)" }
                else { cur_pallet_loc = "보조(우)" }

                if (findRobot) {
                    const findJob = await prisma.job.findFirst({
                        where: {
                            robotId: findRobot.id,
                            endFlag: false,
                            jobPallet: {
                                location: cur_pallet_loc,
                                // isBuffer: false,
                            },
                        },
                        orderBy: {
                            updatedAt: "desc",
                        },
                    });
                    console.log("/cmp_UI/UpdateJobStatus: \n", reqData);
                    if (findJob) {
                        await retry(
                            async (bail: Error) => {
                                await prisma.job.update({
                                    where: { id: findJob.id },
                                    data: {
                                        // loadingRate:LoadingRate,
                                        bph: BPH,
                                        // currentLoadHeight: LoadHeight,
                                    }
                                });
                                success = true;
                            },
                            {
                                retries: 10,
                                factor: 1,
                                minTimeout: 100,
                                onRetry: (error: Error, attempt: number) => {
                                    console.log('Attempt number', attempt, ' failed. Retrying request: /cmp_UI/UpdateJobStatus: job.update');
                                }
                            }
                        );
                    }
                }
            }
            catch (err) {
                console.error("/cmp_UI/UpdateJobStatus/: rejected:", err)
            } finally {
                const responseData = new WSUpdateJobStatusResponse();
                responseData.set(success);
                const responsePacket = new WebPacket();
                responsePacket.set(WSUpdateJobStatusSrv._type, "response", responseData);

                // Send the response back to the ws server
                this.send(responsePacket.toJsonStr());
            }
        }
    }

    private async processSystemStatusReq(reqData: WSSystemStatusRequest) {
        // DB에 req.serial_number 및 req.software_version 입력
        // 입력 완료 시 success 리턴

        const { serial_number, type, value } = reqData;
        if (type !== "toolStatus") { console.log("serial: ", serial_number, "type: ", type, "value", value); }
        let updateData: any = {};
        let success = false
        try {
            const findRobot = await prisma.robot.findUnique({
                where: { serial: serial_number },
            });
            if (findRobot) {
                switch (type) {
                    case "status":
                        updateData.status = value;
                        break;
                    case "operationSpeed":
                        updateData.operatingSpeed = value;
                        break;
                    case "robotPosition":
                        updateData.robotPosition = value;
                        break;
                    case "liftPosition":
                        updateData.liftPosition = value;
                        break;
                    case "toolStatus":
                        if (value != 0) {
                            updateData.toolStatus = true;
                        }
                        else {
                            updateData.toolStatus = false;
                        }
                        break;
                    case "isCameraCalibration":
                        updateData.isCameraCalibration = value;
                        break;
                    case "LoadSpeed":
                        if (value != 0) {
                            this.setSpeed(serial_number);
                        }
                        break;
                    default:
                        console.error("[Error] there is no type: ", type);
                        break;
                }
                if (Object.keys(updateData).length > 0) {
                    await retry(
                        async (bail: Error) => {
                            await prisma.robot.update({
                                where: { serial: serial_number },
                                data: updateData,
                            });
                        },
                        {
                            retries: 10,
                            factor: 1,
                            minTimeout: 100,
                            onRetry: (error: Error, attempt: number) => {
                                console.log('Attempt number', attempt, ' failed. Retrying request: /cmp_UI/SystemStatus: robot.update');
                            }
                        }
                    );
                }
            } else {
                console.error("Robot not found");
            }
        } catch (error) {
            console.error("🚀 processSystemStatusReq error:", error);
        } finally {
            success = true;
            const responseData = new WSSystemStatusResponse();
            responseData.set(success);
            const responsePacket = new WebPacket();
            responsePacket.set(WSSystemStatusSrv._type, "response", responseData);

            // Send the response back to the ws server
            this.send(responsePacket.toJsonStr());
        }
    }

    private async processSystemInfoReq(reqData: WSSystemInfoRequest) {
        // DB에 req.serial_number 및 req.software_version 입력
        console.log(reqData.serial_number);
        console.log(reqData.software_version);
        // 입력 완료 시 success 리턴

        const { serial_number, software_version } = reqData;
        let success = false

        try {
            const findRobots = await prisma.robot.findMany();
            if (findRobots.length > 0) {
                const curRobot = findRobots[0]
                if (curRobot?.serial != serial_number) {
                    await prisma.robot.update({
                        where: {
                            serial: curRobot.serial,
                        },
                        data: {
                            serial: serial_number,
                            morowVersion: software_version,
                            isCameraCalibration: -1,
                            status: 0
                        }
                    })
                }
            } else {
                const robot = await prisma.robot.create({
                    data: {
                        morowVersion: software_version,
                        serial: serial_number,
                        isCameraCalibration: -1,
                    },
                });
                success = true;
            }

            this.createPassword(serial_number);
        } catch (error) {
            console.error("🚀 ~ file: robots.ts:225 ~ error:", error);
        } finally {
            const responseData = new WSSystemInfoResponse();
            responseData.set(success);
            const responsePacket = new WebPacket();
            responsePacket.set(WSSystemInfoSrv._type, "response", responseData);

            // Send the response back to the ws server
            this.send(responsePacket.toJsonStr());
        }
    }

    private async processBarcodeCheckReq(reqData: WSBarcodeCheckRequest) {
        // TODO: change barcode check to check from INEX
        const responseData = new WSBarcodeCheckResponse();
        responseData.set(true, BOX_INSP_CD.OK, "OK");
        const responsePacket = new WebPacket();
        responsePacket.set(WSBarcodeCheckSrv._type, "response", responseData);

        // Send the response back to the ws server
        this.send(responsePacket.toJsonStr());
    }

    private async processBasicAlarmReq(req: WSBasicAlarmRequest) {
        const { serial_number, stamp, level, category, message_key, param, isChecked } = req;
        const paramJSON = JSON.stringify(param);
        let success = false;

        try {
            const findRobot = await prisma.robot.findUnique({
                where: { serial: serial_number },
            });

            if (findRobot) {
                await prisma.log.create({
                    data: { category, message_key, param: paramJSON, level, robotId: findRobot.id, checked: isChecked },
                });
                success = true;
            } else {
                console.error(`Robot with serial number ${serial_number} not found`);
            }
        } catch (error) {
            console.error("Error processing BasicAlarm:", error);
        }

        const responseData = new WSBasicAlarmResponse();
        responseData.set(success);
        const responsePacket = new WebPacket();
        responsePacket.set(WSBasicAlarmSrv._type, "response", responseData);

        // Send the response back to the ws server
        this.send(responsePacket.toJsonStr());
    }

    private createPassword = async (robotSerial: string) => {
        const findPassword = await prisma.adminPassword.findUnique({
            where: {
                robotSerial: robotSerial,
            },
        });
        if (!findPassword) {
            await prisma.adminPassword
                .create({
                    data: { password: hashSync("1234"), robotSerial },
                })
                .catch((e: any) => {
                    console.error("createPassword e : ", e);
                });
        }
        else {
            console.log("Password already exists for robot: ", robotSerial);
        }

    };

    send(data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const finalJson = JSON.stringify(data);
            console.log(`JSON_DATA_2_WSS: ${finalJson}`)
            this.ws?.send(finalJson);
        } else {
            console.error('WebSocket is not open. Unable to send below data:');
            console.error(JSON.stringify(data));
        }
    }

    async controlWordCall(serial_number: string, command: number, job: string) {
        const reqPacket = new WebPacket();
        const controlWordReq = new WSControlWordSrvRequest();

        try {
            controlWordReq.serial_number = serial_number;
            controlWordReq.command = command;
            controlWordReq.job = job;

            reqPacket.set("/morow/controlword", "request", controlWordReq);
            wsClient.send(reqPacket.toJsonStr());
            return true;
        } catch (error) {
            console.error("rejected:", error);
            return false;
        }
    };

    async changeSpeedCall(serial_number: string, value: number) {
        const systemStatusReq = new WSSystemStatusRequest();
        try {
            systemStatusReq.serial_number = serial_number;
            systemStatusReq.type = "operationSpeed";
            systemStatusReq.value = value;
            const reqPacket = new WebPacket();
            reqPacket.set("/morow/systemControl", "request", systemStatusReq);

            //Send the reqPacket to the ws server
            this.send(reqPacket.toJsonStr());
            //Wait for response from ws server
            // this.ws?.on('message', (data: WebSocket.Data) => {
            //     const jsonMessage = JSON.parse(data.toString());
            //     if (jsonMessage.packet_name === "/morow/systemControl" && jsonMessage.packet_type === "response") {
            //         console.log(`get response from server for /morow/systemControl req = ${jsonMessage} `)
            //     }
            // });
            return true;
        } catch (error) {
            console.error("rejected:", error);
            return false;
        }
    };

    async setSpeed(serial_number: string) {
        try {
            const findRobot = await prisma.robot.findUnique({
                where: {
                    serial: serial_number,
                },
            });
            if (findRobot) {
                const systemStatusReq = new WSSystemStatusRequest();
                systemStatusReq.set(serial_number, "operationSpeed", findRobot.operatingSpeed);
                const reqPacket = new WebPacket();
                reqPacket.set("/morow/systemControl", "request", systemStatusReq);

                //Send the reqPacket to the ws server
                this.send(reqPacket.toJsonStr());

                //Wait for response from ws server
                // this.ws?.on('message', (data: WebSocket.Data) => {
                //     const jsonMessage = JSON.parse(data.toString());
                //     if (jsonMessage.packet_name === "/morow/systemControl" && jsonMessage.packet_type === "response") {
                //         console.log(`get response from server for /morow/systemControl req = ${jsonMessage} `)
                //     }
                // });
                return true;
            }
        } catch (error) {
            console.error("rejected:", error);
            return false;
        }
    };

    async buttonStatePub(btnState: WSButtonH2RMsg) {
        const reqPacket = new WebPacket();
        reqPacket.set("/morow/hold2run", "message", btnState);

        //Send the reqPacket to the ws server
        this.send(reqPacket.toJsonStr());
    }

    async gripperControlCall(serial_number: string, ch: number, cmd: boolean) {
        try {
            const gripperControlReq = new WSGripperControlRequest();
            gripperControlReq.serial_number = serial_number;
            gripperControlReq.ch = ch;
            gripperControlReq.cmd = cmd;

            const reqPacket = new WebPacket();
            reqPacket.set(WSGripperConotrlSrv._type, "request", gripperControlReq);

            // Send the reqPacket to the ws server
            this.send(reqPacket.toJsonStr());

            // wait for 1000ms for response from server
            const responsePromise = new Promise<WSGripperControlResponse>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout: No response within 1000ms"));
                }, 1000);

                this.ws?.on('message', (data: WebSocket.Data) => {
                    const jsonMessage = JSON.parse(data.toString());
                    if (jsonMessage.packet_name === WSGripperConotrlSrv._type && jsonMessage.packet_type === "response") {
                        clearTimeout(timeout);
                        resolve(jsonMessage.packet_class as WSGripperControlResponse);
                    }
                });
            });

            let resp = await responsePromise;

            if (resp) {
                if (resp.success) {
                    return true;
                }
                else {
                    return false;
                }
            } else {
                return false;
            }
        }
        catch (error) {
            console.error("gripperControl Call Failed: ", error);
            return false;
        }
    }

    async robotInfoCall() {
        try {
            const wSGetRobotInfoRequest = new WSGetRobotInfoRequest();
            const reqPacket = new WebPacket();
            reqPacket.set("/cmp_UI/getRobotInfo", "request", wSGetRobotInfoRequest);

            // Send the reqPacket to the ws server
            this.send(reqPacket.toJsonStr());

            // wait for 1000ms for response from server
            const responsePromise = new Promise<WSGetRobotInfoResponse>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Timeout: No response within 1000ms"));
                }, 10000);

                this.ws?.on('message', (data: WebSocket.Data) => {
                    const jsonMessage = JSON.parse(data.toString());
                    if (jsonMessage.packet_name === WSGetRobotInfoSrv._type && jsonMessage.packet_type === "response") {
                        clearTimeout(timeout);
                        resolve(jsonMessage.packet_class as WSGetRobotInfoResponse);
                    }
                });
            });

            let resp = await responsePromise;

            if (resp) {
                const robotserial = resp.serial_number
                const robotversion = "v0.0.1";
                console.log("[GETROBOTINFO]: ", resp);
                let useBarcode = resp.project.toUpperCase() == "CHRIS" ? true : false;
                const newValues = {
                    morowVersion: resp.morow_version,
                    visionVersion: resp.vision_version,
                    dockerVersion: resp.docker_version,
                    firmwareVersion: resp.firmware_version,
                    platform: resp.platform.toUpperCase(),
                    application: resp.application.toUpperCase(),
                    project: resp.project.toUpperCase(),
                    isUseBarcode: useBarcode
                }
                this.updateEnvFile(newValues);
                try {
                    const findRobot = await prisma.robot.findUnique({
                        where: {
                            serial: robotserial,
                        },
                    });
                    if (findRobot) {
                        await retry(
                            async (bail: Error) => {
                                const updatedrobot = await prisma.robot.update({
                                    where: {
                                        serial: robotserial,
                                    },
                                    data: newValues
                                });
                            },
                            {
                                retries: 10,
                                factor: 1,
                                minTimeout: 100,
                                onRetry: (error: Error, attempt: number) => {
                                    console.log('Attempt number', attempt, ' failed. Retrying...');
                                }
                            }
                        );
                        if (newValues.application == "DEPALLETIZING") {
                            //check if dragon 88 job exists, and if not, create one.
                            const checkDragonJob = await prisma.palletGroup.findFirst({
                                where: {
                                    name: "DEPAL",
                                    location: "D8"
                                }
                            })
                            if (!checkDragonJob) {
                                await prisma.palletGroup.create({
                                    data: {
                                        name: "DEPAL",
                                        location: "D8",
                                    }
                                })
                            }
                            await wsClient.jobInfoListCall();
                        }
                    }
                } catch (error) {
                    console.error("🚀 ~ file: robots.ts:126 ~ error:", error);
                }
            } else {
                console.error("🚀 WSGetRobotInfoResponse is empty!!");
            }
        } catch (error) {
            console.error("rejected:", error);
        }
    }

    private updateEnvFile(newValues: { morowVersion: string, visionVersion: string, dockerVersion: string, platform: string; application: string; project: string }): void {
        try {
            // Read the current content of the .env file
            const filePath = path.resolve(__dirname, '../../../robot-web/.env');
            // Read the current content of the .env file
            let fileContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
            fileContent = fileContent.trim();
            // Update or add PLATFORM
            if (fileContent.match(/^NEXT_PUBLIC_PLATFORM=.*/m)) {
                fileContent = fileContent.replace(/^NEXT_PUBLIC_PLATFORM=.*/m, `NEXT_PUBLIC_PLATFORM=${newValues.platform}`);
            } else {
                fileContent += `\nPLATFORM=${newValues.platform.toUpperCase()}`;
            }
            // Update or add APPLICATION
            if (fileContent.match(/^NEXT_PUBLIC_APPLICATION=.*/m)) {
                fileContent = fileContent.replace(/^NEXT_PUBLIC_APPLICATION=.*/m, `NEXT_PUBLIC_APPLICATION=${newValues.application}`);
            } else {
                fileContent += `\nNEXT_PUBLIC_APPLICATION=${newValues.application.toUpperCase()}`;
            }
            // Update or add PROJECT
            if (fileContent.match(/^NEXT_PUBLIC_PROJECT=.*/m)) {
                fileContent = fileContent.replace(/^NEXT_PUBLIC_PROJECT=.*/m, `NEXT_PUBLIC_PROJECT=${newValues.project}`);
            } else {
                fileContent += `\nNEXT_PUBLIC_PROJECT=${newValues.project.toUpperCase()}`;
            }
            fileContent += '\n';
            // Write the updated content back to the file
            fs.writeFileSync(filePath, fileContent.trim(), 'utf8'); // `trim()` to remove extra new lines if any
            console.log('File updated successfully');
        } catch (error) {
            console.error('Error updating file:', error);
        }
    }

    private convertToNumber(value: string | null): number | undefined {
        if (value === null) {
            return undefined;
        }

        const numberValue = Number(value);

        if (isNaN(numberValue)) {
            return undefined;
        }

        return numberValue;
    }
}
const wsClient = new WebSocketClient('ws://172.30.1.70:18080');

export default wsClient;
