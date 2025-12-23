/**
 * Message Model - For user-admin communication
 */
import { DataTypes, Model, Optional } from 'sequelize';
import seq from '@/mysql/db/seq.db';

interface MessageAttributes {
  id: number;
  sender_id: string;        // Username of sender
  sender_type: 'user' | 'admin';
  recipient_id: string;     // Username of recipient (or 'all' for broadcast)
  recipient_type: 'user' | 'admin' | 'all';
  subject: string;
  content: string;
  parent_id: number | null; // For replies - links to original message
  is_read: boolean;
  is_broadcast: boolean;    // True if sent to all users
  created_at?: Date;
  updated_at?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'parent_id' | 'is_read' | 'is_broadcast' | 'created_at' | 'updated_at'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: number;
  public sender_id!: string;
  public sender_type!: 'user' | 'admin';
  public recipient_id!: string;
  public recipient_type!: 'user' | 'admin' | 'all';
  public subject!: string;
  public content!: string;
  public parent_id!: number | null;
  public is_read!: boolean;
  public is_broadcast!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    sender_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    sender_type: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
    },
    recipient_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    recipient_type: {
      type: DataTypes.ENUM('user', 'admin', 'all'),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_broadcast: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: seq,
    tableName: 'messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['sender_id'] },
      { fields: ['recipient_id'] },
      { fields: ['parent_id'] },
      { fields: ['is_read'] },
      { fields: ['is_broadcast'] },
    ],
  }
);

export default Message;
