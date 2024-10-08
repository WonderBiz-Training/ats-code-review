import { Injectable, Query } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import User from '../../model/enrolment/user.model';


@Injectable({
  providedIn: 'root',
})
export class UserService {
  private baseURI = 'http://192.168.29.242:5000/api/employeedetail/user';

  constructor(private http: HttpClient) {}

  getUserById(id: number): Observable<User> {
    return this.http.get<User[]>(`${this.baseURI}/${id}`).pipe(
      map((users) => {
        if (users.length === 0) {
          throw new Error('User does not exist');
        }
        return users[0]; // Assuming the response is an array with one user
      }),
      catchError((error) => {
        return throwError(() => new Error(error.message || 'Error fetching user'));
      })
    );
  }
}