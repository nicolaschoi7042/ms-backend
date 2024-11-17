import { PaginationDto, securitySchemes } from "./common";
import * as RobotDto from "./robot.dto";
import * as BarcodeTypeDto from "./barcode-type.dto";
import * as PalletDto from "./pallet.dto";
import * as PalletGroupDto from "./pallet-group.dto";
import * as LoadingPatternDto from "./loading-pattern.dto";
import * as BoxPositionDto from "./box-position.dto";
import * as JobBoxDto from "./job-box.dto";
import * as JobPalletDto from "./job-pallet.dto";
import * as JobDto from "./job.dto";
import * as JobGroupDto from "./job-group.dto";
// schemas.ts
export const components = {
  schemas: {
    PaginationDto,
    ...RobotDto,
    ...BarcodeTypeDto,
    ...PalletDto,
    ...PalletGroupDto,
    ...LoadingPatternDto,
    ...BoxPositionDto,
    ...JobBoxDto,
    ...JobPalletDto,
    ...JobDto,
    ...JobGroupDto,
    // 다른 공통 스키마들이 필요하다면 여기에 추가
  },
  securitySchemes,
};
