import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: signalR.HubConnection;

  private itemUpdateSubject = new BehaviorSubject<any>(null);
  private userUpdateSubject = new BehaviorSubject<any>(null);
  private employeeUpdateSubject = new BehaviorSubject<any>(null);

  itemUpdate$ = this.itemUpdateSubject.asObservable();
  userUpdate$ = this.userUpdateSubject.asObservable();
  employeeUpdate$ = this.employeeUpdateSubject.asObservable();

  constructor() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://192.168.29.242:5000/atsHub') // Update this URL to match your backend's address
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.startConnection();
    this.registerSignalRListeners();
  }

  private startConnection(): void {
    this.hubConnection.start().catch(err => console.error('SignalR Connection Error: ', err));
  }


  private registerSignalRListeners(): void {
    this.hubConnection.on('ReceiveItemUpdate', (userId: number, attendanceLogTime: Date, checkType: string) => {
      this.itemUpdateSubject.next({ userId, attendanceLogTime, checkType });
    });

    this.hubConnection.on('ReceiveSignUpUpdate', (firstName: string, lastName: string, email: string, contactNo: string, password: string, profilePic: string) => {
      this.userUpdateSubject.next({firstName,lastName, email, password, contactNo, profilePic });
    });

    this.hubConnection.on('ReceiveEmployeeUpdate', 
      (userId: number, employeeCode: string, firstName: string, lastName: string, designationId: number, genderId: number, profilePic: string) => {
        this.employeeUpdateSubject.next({ userId, employeeCode, firstName, lastName, designationId, genderId, profilePic });
    });
  }
}
