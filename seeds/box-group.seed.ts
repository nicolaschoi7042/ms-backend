import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BOX_LABEL_DIRECTIONS = new Array(6).fill(0).map((_, index) => index);

export const seedBoxGroups = async () => {
  await prisma.boxGroup.deleteMany({});
  const barcodeTypes = [undefined, ...(await prisma.barcodeType.findMany())];
  await prisma.boxGroup.create({
    data: {
      name: "비즈하우스",
      boxes: {
        create: [
          {
            name: "A",
            width: 150,
            length: 215,
            height: 120,
            weight: 3,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "B",
            width: 200,
            length: 230,
            height: 100,
            weight: 4,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "C",
            width: 200,
            length: 270,
            height: 130,
            weight: 5,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "D",
            width: 190,
            length: 300,
            height: 160,
            weight: 6,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "E",
            width: 250,
            length: 340,
            height: 210,
            weight: 7,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "F",
            width: 310,
            length: 410,
            height: 280,
            weight: 8,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "G",
            width: 380,
            length: 480,
            height: 340,
            weight: 9,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "H",
            width: 480,
            length: 520,
            height: 400,
            weight: 10,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
        ],
      },
    },
  });
  await prisma.boxGroup.create({
    data: {
      name: "우체국",
      boxes: {
        create: [
          {
            name: "1호",
            width: 220,
            length: 190,
            height: 90,
            weight: 2,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "2호",
            width: 270,
            length: 180,
            height: 150,
            weight: 3,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "3호",
            width: 340,
            length: 250,
            height: 210,
            weight: 4,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "4호",
            width: 410,
            length: 310,
            height: 280,
            weight: 5,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "5호",
            width: 480,
            length: 380,
            height: 340,
            weight: 6,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
          {
            name: "6호",
            width: 520,
            length: 480,
            height: 400,
            weight: 7,
            labelDirection:
              BOX_LABEL_DIRECTIONS[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ],
            barcodeTypeId:
              barcodeTypes[
                Math.floor(Math.random() * BOX_LABEL_DIRECTIONS.length)
              ]?.id,
          },
        ],
      },
    },
  });
};
