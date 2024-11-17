import { endOfDay, startOfDay } from "date-fns";
import { formatInTimeZone, zonedTimeToUtc } from "date-fns-tz";
import ko from "date-fns/locale/ko";
import { chain, sumBy } from "lodash";
import { getWarningAndErrorLogCounts } from "./logs.service";
import { prisma } from "../utils/prisma";


export async function getJobsForRobotOnDate(
  robotId: number,
  startDate: Date,
  endDate: Date
) {
  return prisma.job.findMany({
    select: {
      bph: true,
      loadingRate: true,
      endedAt: true,
    },
    where: {
      robotId,
      AND: [
        { startedAt: { gte: startDate } },
        { endedAt: { lte: endDate } },
        { jobPallet: { isBuffer: false } },
      ],
    },
  });
}

export async function getJobsGroupedByEndDate(robotId: number) {
  const jobs = await prisma.job.findMany({
    select: {
      bph: true,
      loadingRate: true,
      endedAt: true,
    },
    where: {
      robotId,
      jobPallet: { isBuffer: false },
      endedAt: { not: null },
    },
    orderBy: {
      endedAt: "desc",
    },
  });
  return Promise.all(
    chain(jobs)
      .groupBy((job) =>
        formatInTimeZone(
          new Date(job.endedAt || 0),
          "Asia/Seoul",
          "yyyy-MM-dd",
          {
            locale: ko,
          }
        )
      )
      .map(async (jobs, date) => {
        const startDate = zonedTimeToUtc(
          startOfDay(new Date(date)),
          "Asia/Seoul"
        );
        const endDate = zonedTimeToUtc(endOfDay(new Date(date)), "Asia/Seoul");
        const logCount = await getWarningAndErrorLogCounts(
          robotId,
          startDate,
          endDate
        );
        return {
          Date: date,
          "Avg. Loading Rate":
            sumBy(jobs, (job) => job.loadingRate) / jobs.length,
          "No. of Pallets": jobs.length,
          "Avg. BPH": sumBy(jobs, (job) => job.bph) / jobs.length,
          "No. of Pallets. of Interventions": logCount,
        };
      })
      .value()
  );
}

async function findOddBoxPositions(jobId: number) {
  try{
      // Step 1: Find all BoxPosition entries with the given jobId and boxName not equal to "ghost"
    const boxPositions = await prisma.boxPosition.findMany({
      where: {
        jobId,
        boxName: {
          not: 'ghost'
        }
      }
    });

    // Step 2: Group these entries by boxBarcode and count the occurrences
    const grouped = boxPositions.reduce((acc, box) => {
      if (!acc[box.boxBarcode]) {
        acc[box.boxBarcode] = [];
      }
      acc[box.boxBarcode].push(box);
      return acc;
    }, {} as Record<string, typeof boxPositions>);

    // Step 3: Filter out the groups with even counts
    const filtered = Object.values(grouped).filter(group => group.length % 2 !== 0);

    // Step 4: For groups with a count more than 1, select the most recent createdAt value
    const result = filtered.map(group => {
      if (group.length > 1) {
        group.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return group[0];
    });

    // Step 5: Select fields [boxName, z, height, boxBarcode]
    return result.map(box => ({
      boxName: box.boxName,
      z: box.z,
      box_height: box.height,
      box_width: box.width,
      box_length: box.length,
      boxBarcode: box.boxBarcode
    }));
  }
  catch(e){
    console.error(`Error in findOddBoxPositions: ${e}`);
    return [];
  }
}

export async function updateJobInfo(jobId: number){
  console.log(`Updating job info for job ${jobId}`);
  const oddBoxPositions = await findOddBoxPositions(jobId);
  if (oddBoxPositions.length === 0) {
    return;
  }
  // find largest boxPosition.z + boxPosition.height

  // Get current Job
  try{
    const job = await prisma.job.findUnique({
      where: { id: Number(jobId) },
      include:{
        jobPallet:true,
      }
    });
    if (!job) {
      console.error(`Job not found ${__dirname}/${__filename}`);
      return;
    }
    if(!job.jobPallet || !job.jobPallet===null){
      console.error(`Job Pallet not found ${__dirname}/${__filename}`);
      return;
    }
    // get current size of jobPallet
    const jobPallet = job.jobPallet;
    const { width, height, loadingHeight } = jobPallet
    const pallet_length = jobPallet.length;
  
    let maxBox = oddBoxPositions[0];
    let maxZHeight = maxBox.z + maxBox.box_height + height;
    let totalboxVolume = 0;
    for (const box of oddBoxPositions) {
      const currentZHeight = box.z + box.box_height + height;
      if (currentZHeight > maxZHeight) {
        maxBox = box;
        maxZHeight = currentZHeight;
      }
      else if (currentZHeight === height){
        maxZHeight = 0;
      }

      totalboxVolume += box.box_width * box.box_height * box.box_length;
    }
    // calculate total volume of job pallet
  
    const palletVolume = width * (loadingHeight-height) * pallet_length;
    // calculate loading rate
    const loadingRate = Math.ceil(totalboxVolume*100 / palletVolume);
    console.log("palletVolume: ", palletVolume, " total Box Volume: ", totalboxVolume, " loadingRate: ", loadingRate);
    try{
      // update job height and loading rate
      await prisma.job.update({
        where: { id: Number(jobId) },
        data: {
          currentLoadHeight: maxZHeight,
          loadingRate: loadingRate,
        },
      });
      console.log(`Updated job ${jobId} with currentLoadHeight: ${maxZHeight} and loadingRate: ${loadingRate}`);
    } catch (e){
      console.error(`Error in updateJobInfo: ${e}`);
      return;
    }
  } catch (e){
    console.error(`Error in updateJobInfo: ${e}`);
    return;
  }

}
