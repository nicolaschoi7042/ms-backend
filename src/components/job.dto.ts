export const CreateJobPalletDto = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string" },
    palletBarcode: { type: "string" },
  },
};

export const ContinueJobPalletDto = {
  type: "object",
  required: ["id", "palletBarcode"],
  properties: {
    id: { type: "number" },
    palletBarcode: { type: "string" },
  },
};

export type ICreateJobPalletDto = {
  id: string;
  palletBarcode: string;
};

export type IContinueJobPalletDto = {
  id: number;
  palletBarcode: string;
};

export const CreateJobDto = {
  type: "object",
  required: ["robotSerial", "enableConcurrent", "pallets", "palletGroupId"],
  properties: {
    palletGroupId: { type: "number" },
    robotSerial: { type: "string" },
    enableConcurrent: { type: "boolean" },
    pallets: {
      type: "array",
      items: { $ref: "#/components/schemas/CreateJobPalletDto" },
    },
  },
};

export const ContinueJobDto = {
  type: "object",
  required: ["robotSerial", "enableConcurrent", "jobPallets"],
  properties: {
    robotSerial: { type: "string" },
    enableConcurrent: { type: "boolean" },
    jobPallets: {
      type: "array",
      items: { $ref: "#/components/schemas/ContinueJobPalletDto" },
    },
  },
};

export type IContinueJobDto = {
  robotSerial: string;
  enableConcurrent: boolean;
  jobPallets: IContinueJobPalletDto[];
};

export type ICrateJobDto = {
  palletGroupId: number;
  robotSerial: string;
  enableConcurrent: boolean;
  pallets: ICreateJobPalletDto[];
};

export const JobDto = {
  type: "object",
  required: [
    "id",
    "robotId",
    "loadingRate",
    "bph",
    "currentLoadHeight",
    "endFlag",
    "jobPallet",
    "JobBoxes",
    "startedAt",
    "endedAt",
    "createdAt",
    "updatedAt",
    "boxPositions",
    "jobGroupId",
  ],
  properties: {
    id: { type: "integer" },
    robotId: { type: "integer" },
    loadingRate: { type: "number" },
    bph: { type: "number" },
    currentLoadHeight: { type: "number" },
    endFlag: { type: "boolean" },
    jobPallet: { $ref: "#/components/schemas/JobPalletDto" },
    jobBoxes: {
      type: "string",
    },
    boxPositions: {
      type: "array",
      items: { $ref: "#/components/schemas/BoxPositionDto" },
    },
    jobGroupId: { type: "integer" },
    startedAt: { type: "string" },
    endedAt: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
};

export const UpdateJobDto = {
  type: "object",
  properties: {
    endedAt: { type: "string" },
    loadingRate: { type: "number" },
    bph: { type: "number" },
    currentLoadHeight: { type: "number" },
  },
};
