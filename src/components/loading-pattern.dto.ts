import { BoxPositionDto } from "./box-position.dto";

export const LoadingPatternDto = {
  type: "object",
  required: ["id", "name", "boxGroup", "isSelectable", "createdAt", "updatedAt"],
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    boxGroup: { type: "string" },
    isSelectable: { type: "boolean" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  example: {
    id: 1,
    name: "Pattern 1",
    boxGroup: "BoxGroup 1",
    isSelectable: true,
    createdAt: "2022-01-01T00:00:00.000Z",
    updatedAt: "2022-01-01T00:00:00.000Z",
  },
};

export const CreateLoadingPatternDto = {
  type: "object",
  required: ["name", "isSelectable"],
  properties: {
    name: { type: "string" },
    isSelectable: { type: "boolean" },
  },
  example: {
    name: "Pattern 1",
    isSelectable: true,
  },
};

export const CreateLoadingPatternPreviewDto = {
  type: "object",
  required: ["palletSpecificationId", "boxGroupId", "loadingHeight"],
  properties: {
    palletSpecificationId: { type: "string" },
    boxGroupId: { type: "integer" },
    loadingHeight: { type: "integer" },
  },
  example: {
    palletSpecificationId: "550e8400-e29b-41d4-a716-446655440000",
    boxGroupId: 1,
    loadingHeight: 1200,
  },
};

export const LoadingPatternPreviewDto = {
  type: "object",
  required: [
    "name",
    "loadingBoxCount",
    "loadingRate",
    "isSelectable",
    "boxPositions",
  ],
  properties: {
    name: { type: "string" },
    loadingBoxCount: { type: "integer" },
    loadingRate: { type: "number" },
    isSelectable: { type: "boolean" },
    boxPositions: {
      type: "array",
      items: {
        $ref: "#/components/schemas/BoxPositionDto",
      },
    },
  },
  example: {
    name: "180도 회전",
    loadingBoxCount: 25,
    loadingRate: 93.2,
    isSelectable: true,
    boxPositions: [
      {
        id: 1,
        jobId: 101,
        x: 100.5,
        y: 200.5,
        z: 300.5,
        width: 50.0,
        height: 60.0,
        length: 70.0,
        boxName: "Box A",
        boxBarcode: "ABC123XYZ",
        loadingOrder: 1,
        isLoading: true,
        rotationType: 0,
        boxId: "box123",
        createdAt: "2023-01-01T12:00:00Z",
        updatedAt: "2023-01-02T12:00:00Z",
      },
    ],
  },
};
export const CreateLoadingPatternPreviewResponseDto = {
  type: "array",
  items: {
    $ref: "#/components/schemas/LoadingPatternPreviewDto",
  },
};
