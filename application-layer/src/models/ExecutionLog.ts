import mongoose, { Schema } from 'mongoose';

import { IExecutionLog } from '../types/mongoose/interfaces';

const ExecutionLogSchema = new Schema({
  sessionId: { 
    type: String, 
    required: true,
    index: true
  },
  userId: { 
    type: mongoose.Types.ObjectId, 
    required: true,
    ref: "User"
  },
  input: { 
    type: String, 
    required: true 
  },
  output: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Success', 'Error', 'Timeout'], 
    required: true 
  },
  duration_ms: { 
    type: Number, 
    required: true 
  },
}, {
  timestamps: true,
});

export default mongoose.model<IExecutionLog>('ExecutionLog', ExecutionLogSchema);