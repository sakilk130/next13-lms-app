import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import Mux from '@mux/mux-node';

import { db } from '@/lib/db';

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID!,
  process.env.MUX_TOKEN_SECRET!
);

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: {
      chapterId: string;
      courseId: string;
    };
  }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }
    const { courseId, chapterId } = params;

    const ownCourse = await db.course.findUnique({
      where: {
        id: courseId,
        userId,
      },
    });
    if (!ownCourse) {
      return new Response('Unauthorized', { status: 401 });
    }
    const values = await req.json();
    const chapter = await db.chapter.update({
      where: {
        id: chapterId,
        courseId,
      },
      data: {
        ...values,
      },
    });

    if (chapter.videoUrl) {
      const existingMuxData = await db.muxData.findFirst({
        where: {
          chapterId: params.chapterId,
        },
      });
      if (existingMuxData) {
        await Video.Assets.del(existingMuxData.assetId);
        await db.muxData.delete({
          where: {
            id: existingMuxData.id,
          },
        });
      }

      const asset = await Video.Assets.create({
        input: chapter.videoUrl,
        playback_policy: 'public',
        test: false,
      });

      await db.muxData.create({
        data: {
          chapterId: params.chapterId,
          assetId: asset.id,
          playbackId: asset.playback_ids?.[0]?.id,
        },
      });
    }
    return NextResponse.json(chapter);
  } catch (error) {
    console.log('[COURSES_CHAPTER_ID]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
