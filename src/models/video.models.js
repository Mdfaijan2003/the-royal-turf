/*
  _id string pk // Do not include this in the schema, mongoose will create it
  videoFile string
  thumbnail string
  owner objectId users
  title string
  description string
  duration number
  views number
  ispublished boolean
  createdAt Date
  updatedAt Date

*/

import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
  videoFile: {
    type: String, //Cloudinary URL
    required: true,
  },
  thumbnail: {
    type: String,
    required: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  isPublished: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// "mongooseAggregatePaginate" is a plugin that allows pagination of aggregation queries
// It is useful for handling large datasets and providing efficient pagination in applications.
// Example usage:
// const options = {  
//   page: 1, // Page number
//   limit: 10, // Number of documents per page
//   sort: { createdAt: -1 }, // Sort by createdAt in descending order
// };
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
