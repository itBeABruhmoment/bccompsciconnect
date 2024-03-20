import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BoardService {

  api = 'http://localhost:8080/api';
  constructor(private http: HttpClient) { }

  getBoards() {
    return this.http.get<any[]>(`${this.api}/boards`, {withCredentials: true })
  }

  getBoard(id: any) {
    return this.http.get<any>(`${this.api}/board/${id}`, {withCredentials: true })
  }

  //probably move this to another service file if needed
  getTopic(boardId: any, topicId: any) {
    return this.http.get<any>(`${this.api}/board/${boardId}/topic/${topicId}`,{withCredentials: true })
  }

  
}
