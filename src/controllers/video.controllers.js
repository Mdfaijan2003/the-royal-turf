import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  // Convert parameters and calculate pagination skip value
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;

  if (userId && !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  // 3. Build the Match Stage ($match) for Filtering
  const matchConditions = {};
  const sort = {};

  // Filter by userId/owner if provided
  if (userId) {
    // Ensure userId is converted to an ObjectId for matching
    matchConditions.owner = new mongoose.Types.ObjectId(userId);
  }

  // Apply search query filter if provided (Title or Description)
  if (query?.trim()) {
    const regexQuery = {
      $regex: query.trim(),
      $options: "i",
    };
    // Use $or to search across multiple fields
    matchConditions.$or = [
      {
        title: regexQuery,
      },
      {
        description: regexQuery,
      },
    ];
  }

  matchConditions.isPublished = true;

  const sortOrder = sortType === "asc" ? 1 : -1; // 1 for ascending, -1 for descending

  // Set sort field (default to createdAt if not provided)
  const sortField = sortBy?.trim() || "createdAt";
  sort[sortField] = sortOrder;

  // 5. Define the Aggregation Pipeline
  const pipeline = [];

  // Add $match stage only if there are filter conditions
  if (Object.keys(matchConditions).length > 0) {
    pipeline.push({
      $match: matchConditions,
    });
  }

  // Lookup the owner details (assuming 'owner' is the localField on the Video model)
  pipeline.push({
    $lookup: {
      from: " User ",
      localField: "owner",
      foreignField: "_id",
      as: "ownerDetails",
      pipeline: [
        {
          // Project only necessary owner fields
          $project: {
            username: 1,
            avatar: 1,
            fullname: 1,
          },
        },
      ],
    },
  });

  // Deconstruct the ownerDetails array (since there's only one owner)
  pipeline.push({
    $unwind: "$ownerDetails",
  });

  // Add $sort stage
  pipeline.push({
    $sort: sort,
  });

  // Add $skip stage for pagination
  pipeline.push({
    $skip: skip,
  });

  // Add $limit stage for pagination
  pipeline.push({
    $limit: limitNumber,
  });

  // Final Projection: Clean up the output fields
  pipeline.push({
    $project: {
      _id: 1,
      videoFile: 1,
      thumbnail: 1,
      title: 1,
      description: 1,
      duration: 1,
      views: 1,
      createdAt: 1,
      owner: "$ownerDetails", // Replace owner ID with the projected owner object
    },
  });

  // 6. Execute the Pipeline
  const videos = await Video.aggregate(pipeline);

  // 7. Handle Result and Response
  return res.status(200).json(
    new apiResponse(
      200,
      {
        videos,
        page: pageNumber,
        limit: limitNumber,
        hasMore: videos.length === limitNumber,
      },
      "Videos fetched successfully"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res, next) => {
  const { title, description } = req.body;
  const userId = req.userId;

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!title?.trim() || !description?.trim()) {
    return next(new ApiError(400, "Title and description are required"));
  }
  if (!videoFileLocalPath) {
    return next(new ApiError(400, "Video file is required"));
  }
  if (!thumbnailLocalPath) {
    return next(new ApiError(400, "Thumbnail is required"));
  }
  if (!isValidObjectId(userId)) {
    return next(new ApiError(400, "Invalid User ID"));
  }

  let videoFile, thumbnail;
  let newVideoDoc;

  try {
    [videoFile, thumbnail] = await Promise.all([
      uploadOnCloudinary(videoFileLocalPath, { resource_type: "video" }),
      uploadOnCloudinary(thumbnailLocalPath, { resource_type: "image" }),
    ]);

    if (!videoFile || !thumbnail) {
      throw new Error("Upload failed: missing upload response");
    }

    const newVideoDoc = await Video.create({
      videoFile: videoFile.secure_url,
      thumbnail: thumbnail.secure_url,
      owner: userId,
      title,
      description,
      duration: videoFile.duration ?? 0,
      isPublished: true,
    });

    const video = await Video.findById(newVideoDoc._id).populate(
      "owner",
      "username"
    );

    if (!video) {
      throw new Error("Failed to fetch created video");
    }

    // Respond
    return res
      .status(201)
      .json(new apiResponse(201, { video }, "Video published successfully"));
  } catch (err) {
    console.error("Error in publishing the Video:", err);

    // Cleanup Cloudinary if needed
    const publicIdsToCleanup = [];
    if (videoFile?.public_id) publicIdsToCleanup.push(videoFile.public_id);
    if (thumbnail?.public_id) publicIdsToCleanup.push(thumbnail.public_id);

    if (publicIdsToCleanup.length) {
      try {
        await Promise.all(
          publicIdsToCleanup.map(id => deleteFromCloudinary(id))
        );
        console.log("Cleanup on Cloudinary succeeded:", publicIdsToCleanup);
      } catch (cleanupErr) {
        console.error("Cleanup failed:", cleanupErr);
      }
    }

    // Cleanup DB document if partially created
    if (newVideoDoc?.id) {
      await Video.findByIdAndDelete(newVideoDoc._id).catch(dErr => {
        console.error("Failed to delete partial video doc:", dErr);
      });
    }

    // Also remove local temp files
    try {
      await Promise.all([
        fs.promises.unlink(videoFileLocalPath).catch(() => {}),
        fs.promises.unlink(thumbnailLocalPath).catch(() => {}),
      ]);
    } catch (_) {
      // ignore
    }

    return next(new ApiError(500, err.message || "Failed to publish video"));
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    {
      $inc: { views: 1 },
    },
    { new: true }
  ).populate("owner", "username avatar fullname");

  if (!video || !video.isPublished) {
    throw new ApiError(404, "Video not found or is not published");
  }

  // const pipeline = [
  //   {
  //     $match: {
  //       _id: mongoose.Types.ObjectId(videoId),
  //       isPublished: true,
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: "comments",
  //       localField: "_id",
  //       foreignField: "video",
  //       as: "comments",
  //       pipeline: [
  //         { $sort: { createdAt: -1 } }, // Sort comments by creation date (newest first)
  //         {
  //           $lookup: {
  //             from: "users",
  //             localField: "owner",
  //             foreignField: "_id",
  //             as: "owner",
  //           },
  //         },
  //         {
  //           $unwind: {
  //             path: "$owner",
  //             preserveNullAndEmptyArrays: true,
  //           },
  //         },
  //       ],
  //     },
  //   },
  // ];

  return res
    .status(200)
    .json(new apiResponse(200, { video }, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
  const { title, description } = req.body;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }
  if (
    [title, description].some(field => field !== undefined && !field?.trim())
  ) {
    throw new ApiError(400, "Title and description cannot be empty");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  // Authorization check (if needed)
  if (video.owner.toString() !== req.userId) {
    return next(new ApiError(403, "Not authorized to update this video"));
  }

  video.title = title?.trim() || video.title;
  video.description = description?.trim() || video.description;

  const thumbnailToDelete = video.thumbnail;
  if (thumbnailToDelete) {
    try {
      await deleteFromCloudinary(thumbnailToDelete);
    } catch (err) {
      console.error("Failed to delete thumbnail from Cloudinary:", err);
    }
  }

  let thumbnail;
  try {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath, {
      resource_type: "image",
    });
  } catch (error) {
    console.error("Failed to upload thumbnail to Cloudinary:", error);
  }

  video.thumbnail = thumbnail?.secure_url || video.thumbnail;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, { video }, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.userId) {
    return next(new ApiError(403, "Not authorized to delete this video"));
  }

  await video.remove();

  return res
    .status(200)
    .json(new apiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.userId) {
    return next(
      new ApiError(
        403,
        "Not authorized to change the Publish Status of this video"
      )
    );
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { video },
        `Video is now ${video.isPublished ? "Published" : "Unpublished"}`
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
