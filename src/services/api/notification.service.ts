import axios from "axios";
import { API_BASE_URL } from "./gateway";

const api=axios.create({baseURL:API_BASE_URL});
api.interceptors.request.use((config)=>{const token=localStorage.getItem("auth_token");if(token)config.headers.Authorization=`Bearer ${token}`;return config;});

export interface UserNotification { id:string; type:string; subject:string; body:string; email_status:string; created_at:string; sent_at?:string|null; }
export const notificationService={
  async list():Promise<UserNotification[]>{
    const response=await api.get("/notifications");
    return response.data?.data || [];
  }
};
