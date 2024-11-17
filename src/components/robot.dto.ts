export const RobotDto = {
  type: "object",
  required: [
    "id",
    "version",
    "serial",
    "connection",
    "status",
    "operatingSpeed",
    "robotPosition",
    "liftPosition",
    "toolStatus",
    "eventAlarmCode",
    "isCameraCalibration",
    "isCameraPositionCalibration",
    "isUseBarcode",
    "gripperPosition",
    "isUseAdminPassword",
  ],
  properties: {
    id: { type: "integer" },
    version: {type: "string"},
    project: {type: "string"},
    application: {type: "string"},
    platform: {type: "string"},
    morowVersion: { type: "string" },
    visionVersion: { type: "string" },
    dockerVersion: { type: "string" },
    firmwareVersion: {type: "string"},
    serial: { type: "string" },
    connection: { type: "boolean" },
    status: { type: "integer" },
    operatingSpeed: { type: "integer" },
    robotPosition: { type: "integer" },
    liftPosition: { type: "integer" },
    toolStatus: { type: "boolean" },
    eventAlarmCode: { type: "integer" },
    isCameraCalibration: { type: "integer" },
    isCameraPositionCalibration: { type: "integer" },
    isUseBarcode: { type: "boolean" },
    gripperPosition: { type: "integer" },
    isUseAdminPassword: { type: "boolean" },
  },
};

export const DailyWorkSummaryDto = {
  type: "object",
  required: [
    "jobs",
    "avgBph",
    "avgLoadingRate",
    "finishedPalletCount",
    "warningAndErrorLogCounts",
  ],
  properties: {
    jobs: {
      type: "array",
      items: {
        type: "object",
        required: ["loadingRate", "bph"],
        properties: {
          loadingRate: { type: "number", format: "float" },
          bph: { type: "number", format: "float" },
        },
      },
    },
    avgBph: {
      type: "number",
      format: "float",
      description: "Average BPH for the robot on the given day",
    },
    avgLoadingRate: {
      type: "number",
      format: "float",
      description: "Average loading rate for the robot on the given day",
    },
    finishedPalletCount: {
      type: "integer",
      description: "Number of finished pallets on the given day",
    },
    warningAndErrorLogCounts: {
      type: "integer",
      description: "Count of warning and error logs on the given day",
    },
  },
};

export const CreateRobotDto = {
  type: "object",
  required: ["version", "serial"],
  properties: {
    version: { type: "string" },
    project: {type: "string"},
    application: {type: "string"},
    platform: {type: "string"},
    morowVersion: { type: "string" },
    visionVersion: { type: "string" },
    dockerVersion: { type: "string" },
    firmwareVersion: {type: "string"},
    serial: { type: "string" },
    connection: { type: "boolean" },
    status: { type: "integer" },
    operatingSpeed: { type: "integer" },
    robotPosition: { type: "integer" },
    liftPosition: { type: "integer" },
    toolStatus: { type: "boolean" },
    eventAlarmCode: { type: "integer" },
    isCameraCalibration: { type: "integer" },
    isCameraPositionCalibration: { type: "integer" },
  },
};

export const UpdateRobotDto = {
  type: "object",
  properties: {
    project: {type: "string"},
    application: {type: "string"},
    platform: {type: "string"},
    morowVersion: { type: "string" },
    visionVersion: { type: "string" },
    dockerVersion: { type: "string" },
    firmwareVersion: {type: "string"},
    connection: { type: "boolean" },
    status: { type: "integer" },
    operatingSpeed: { type: "integer" },
    robotPosition: { type: "integer" },
    liftPosition: { type: "integer" },
    toolStatus: { type: "boolean" },
    eventAlarmCode: { type: "integer" },
    isCameraCalibration: { type: "integer" },
    isCameraPositionCalibration: { type: "integer" },
    isUseBarcode: { type: "boolean" },
    isUseAdminPassword: { type: "boolean" },
  },
};

export const JobDaySummary = {
  type: "object",
  required: ["avgBph", "avgLoadingRate"],
  properties: {
    avgBph: {
      type: "number",
      format: "float",
      description: "Average BPH for the robot on the specific day",
    },
    avgLoadingRate: {
      type: "number",
      format: "float",
      description: "Average loading rate for the robot on the specific day",
    },
  },
};

export const MonthlyWorkSummaryDto = {
  type: "object",
  required: [
    "jobByDay",
    "avgBph",
    "avgLoadingRate",
    "finishedPalletCount",
    "warningAndErrorLogCounts",
  ],
  properties: {
    jobByDay: {
      type: "object",
      additionalProperties: JobDaySummary,
    },
    avgBph: {
      type: "number",
      format: "float",
      description: "Average BPH for the robot for the entire month",
    },
    avgLoadingRate: {
      type: "number",
      format: "float",
      description: "Average loading rate for the robot for the entire month",
    },
    finishedPalletCount: {
      type: "integer",
      description: "Number of finished pallets for the entire month",
    },
    warningAndErrorLogCounts: {
      type: "integer",
      description: "Count of warning and error logs for the entire month",
    },
  },
};

export const RobotJobSummaryDto = {
  type: "object",
  required: [
    "id",
    "bph",
    "loadingRate",
    "startedAt",
    "endedAt",
    "_count",
    "jobPallet",
    "JobGroup",
  ],
  properties: {
    id: {
      type: "string",
      description: "The unique identifier for the job.",
    },
    bph: {
      type: "number",
      description: "BPH (Boxes Per Hour) of the job.",
    },
    loadingRate: {
      type: "number",
      description: "Loading rate of the job.",
    },
    startedAt: {
      type: "string",
      format: "date-time",
      description: "The start date and time of the job.",
    },
    endedAt: {
      type: "string",
      format: "date-time",
      description: "The end date and time of the job.",
    },
    _count: {
      type: "object",
      required: ["boxPositions"],
      properties: {
        boxPositions: {
          type: "integer",
          description: "Count of job boxes.",
        },
      },
    },
    jobPallet: {
      type: "object",
      required: ["orderInformation", "palletBarcode"],
      properties: {
        orderInformation: {
          type: "string",
          description: "Order group of the job pallet.",
        },
        palletBarcode: {
          type: "string",
          description: "Pallet barcode of the job pallet.",
        },
      },
    },
    JobGroup: {
      type: "object",
      required: ["name", "location"],
      properties: {
        name: {
          type: "string",
          description: "Name of the job group.",
        },
        location: {
          type: "string",
          description: "Location of the job group.",
        },
      },
    },
  },
};

export const RobotJobContinueStopDto = {
  type: "object",
  required: ["jobId"],
  properties: {
    jobId: {
      type: "integer",
      description: "The unique identifier for the job.",
    },
  },
};

export const RobotJobContinueDto = {
  type: "object",
  required: ["jobId", "palletBarcode"],
  properties: {
    jobId: {
      type: "integer",
      description: "The unique identifier for the job.",
    },
    palletBarcode: {
      type: "string",
      description: "Pallet barcode of the job pallet.",
    },
  },
};
