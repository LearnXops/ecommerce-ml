"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
jest.setTimeout(30000);
//# sourceMappingURL=setup.js.map