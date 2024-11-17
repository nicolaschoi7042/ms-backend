export const BoxPositionDto = {
  type: "object",
  required: [
    "id",
    "jobId",
    "x",
    "y",
    "z",
    "width",
    "height",
    "length",
    "boxName",
    "boxBarcode",
    "loadingOrder",
    "isLoading",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: {
      type: "integer",
      description: "Unique identifier for the box position.",
      example: 1,
    },
    jobId: {
      type: "integer",
      description: "Identifier for the associated job.",
      example: 101,
    },
    x: {
      type: "number",
      format: "float",
      description: "X-coordinate of the box position.",
      example: 100.5,
    },
    y: {
      type: "number",
      format: "float",
      description: "Y-coordinate of the box position.",
      example: 200.5,
    },
    z: {
      type: "number",
      format: "float",
      description: "Z-coordinate of the box position.",
      example: 300.5,
    },
    width: {
      type: "number",
      format: "float",
      description: "Width of the box.",
      example: 50.0,
    },
    height: {
      type: "number",
      format: "float",
      description: "Height of the box.",
      example: 60.0,
    },
    length: {
      type: "number",
      format: "float",
      description: "Length of the box.",
      example: 70.0,
    },
    boxName: {
      type: "string",
      description: "Name of the box.",
      example: "Box A",
    },
    boxBarcode: {
      type: "string",
      description: "Barcode associated with the box.",
      example: "ABC123XYZ",
    },
    loadingOrder: {
      type: "number",
      format: "float",
      description: "Order in which the box should be loaded.",
      example: 1,
    },
    isLoading: {
      type: "boolean",
      description: "Indicates if the box is currently being loaded.",
      example: true,
    },
    rotationType: {
      type: "number",
      description: "Rotation type of the box.",
      example: 0,
    },
    boxId: {
      type: "string",
      description: "Identifier for the box. It is optional.",
      example: "box123",
    },
    createdAt: {
      type: "string",
      format: "date-time",
      description: "Timestamp when the box position was created.",
      example: "2023-01-01T12:00:00Z",
    },
    updatedAt: {
      type: "string",
      format: "date-time",
      description: "Timestamp when the box position was last updated.",
      example: "2023-01-02T12:00:00Z",
    },
  },
};

export const CreateBoxPositionDto = {
  type: "object",
  required: [
    "jobId",
    "x",
    "y",
    "z",
    "width",
    "height",
    "length",
    "boxName",
    "boxBarcode",
    "loadingOrder",
    "isLoading",
  ],
  properties: {
    jobId: {
      type: "integer",
      example: 101,
    },
    x: {
      type: "number",
      example: 100.5,
    },
    y: {
      type: "number",
      example: 200.5,
    },
    z: {
      type: "number",
      example: 300.5,
    },
    width: {
      type: "number",
      example: 50.0,
    },
    height: {
      type: "number",
      example: 60.0,
    },
    length: {
      type: "number",
      example: 70.0,
    },
    boxName: {
      type: "string",
      example: "Box B",
    },
    boxBarcode: {
      type: "string",
      example: "XYZ789ABC",
    },
    loadingOrder: {
      type: "number",
      example: 2,
    },
    isLoading: {
      type: "boolean",
      example: false,
    },
    rotationType: {
      type: "number",
      example: 1,
    },
    boxId: {
      type: "string",
      example: "box456",
    },
  },
};
