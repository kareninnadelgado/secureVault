import {
  createArchiveJob as createArchiveJobService,
  getJobStatus as getJobStatusService,
  getCompletedJobForDownload,
} from '../services/documentJob.service.js';

import { getRequestInfo } from '../utils/requestInfo.js';

import { createReadStream } from 'node:fs';
import path from 'node:path';

export async function createArchiveJob(
  req,
  res,
  next
) {
  try {
    const { ipAddress, userAgent } =
      getRequestInfo(req);

    const result = await createArchiveJobService({
      documentIds: req.body.documentIds,
      userId: req.user.id,
      userRole: req.user.role,
      ipAddress,
      userAgent,
    });

    return res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getJobStatus(
  req,
  res,
  next
) {
  try {
    const result = await getJobStatusService({
      jobId: req.params.id,
      userId: req.user.id,
      userRole: req.user.role,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadCompletedJob(
  req,
  res,
  next
) {
  try {
    const { outputPath, documentCount } =
      await getCompletedJobForDownload({
        jobId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
      });

    const storageRoot = path.resolve(
      process.cwd(),
      'storage'
    );

    const absolutePath = path.resolve(
      storageRoot,
      outputPath
    );

    if (
      absolutePath !== storageRoot &&
      !absolutePath.startsWith(
        `${storageRoot}${path.sep}`
      )
    ) {
      return next(
        new Error('Invalid job output path')
      );
    }

    res.setHeader(
      'Content-Type',
      'application/zip'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="securevault-documents-${req.params.id}.zip"`
    );

    const stream = createReadStream(absolutePath);

    stream.on('error', next);
    stream.pipe(res);

    void documentCount;
  } catch (error) {
    next(error);
  }
}