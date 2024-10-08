import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AttendanceLogService } from '../../../../services/attendanceLog/attendance-log.service';
import { ActivityRecordModel } from '../../../../model/ActivityRecord.model';
import { EncryptDescrypt } from '../../../../utils/genericFunction';
import { EmployeeService } from '../../../../services/employee/employee.service';
import { UserService } from '../../../../services/user/user.service';
import { SignalRService } from '../../../../services/signalR/signal-r.service';
import { data } from '@tensorflow/tfjs';
import moment from 'moment';
import EmployeeModel from '../../../../model/employee-sign-up.model';

@Component({
  selector: 'app-employee-detail',
  templateUrl: './employee-detail.component.html',
  styleUrls: ['./employee-detail.component.css'],
})
export class EmployeeDetailComponent implements OnInit {
  // employee: EmployeeModel = {
  //   id: '',
  //   userId: '',
  //   firstName: '',
  //   lastName: '',
  //   email: '',
  //   contactNo: '',
  //   password: '',
  //   profilePic: ''
  // };
  employee:any = {}
  // user: any = {};
  inOutData: any[] = [];
  misEntriesData: any[] = [];
  selectedDate: Date = new Date();
  formattedDate: string = '';
  columnsTable1 = [
    { key: 'inTime', label: 'In Time' },
    { key: 'outTime', label: 'Out Time' },
    { key: 'inHours', label: 'Total In Time' },
  ];

  columnsTable2 = [
    { key: 'inTime', label: 'In Time' },
    { key: 'outTime', label: 'Out Time' },
    { key: 'outHours', label: 'Total Out Time' },
  ];

  tabNames = ['Today', 'Yesterday', 'Day Before Yesterday'];
  tabs = ['today', 'yesterday', 'dayBeforeYesterday'];

  activeTab: string = 'today';


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private attendanceLogService: AttendanceLogService,
    private employeeService: EmployeeService,
    private userService: UserService,
    private signalRService: SignalRService
  ) {

  }

  activityInRecords: ActivityRecordModel[] = [];
  activityOutRecords: ActivityRecordModel[] = [];

  employeeHoursData: any[] = [];
  lineChartDataJson: string = '';
  lineChartOptionsJson: string = '';

  startDate: string = '';
  endDate: string = '';

  ngOnInit() {
    const encryptedId = this.route.snapshot.paramMap.get('id');
    if (encryptedId) {
      const employeeId = EncryptDescrypt.decrypt(encryptedId);
      console.log('Decrypted Employee ID:', employeeId);

      this.updateDatesAndFetchData();
      this.employeeService.getEmployeeByUserId(employeeId).subscribe(data => {
        console.log(data)
        this.employee =data![0]
        // console.log(data![0].userId)
        // if (data![0].userId) {
        //   this.employee.userId = data![0].userId
        // }
        console.log('Employee Data:', this.employee);
      });

      // this.userService.getUserById(employeeId).subscribe(data => {
      //   this.user = data;
      //   console.log('User Data:', this.user);
      // });

      this.formattedDate = this.selectedDate.toLocaleDateString();

      this.subscribeToItemUpdates(employeeId);
    } else {
      console.error('Employee ID is missing in the URL');
    }
    this.loadMisEntriesData();
    this.getEmployeeHoursByUserId();
  }

  onEdit() {
    console.log(this.employee.userId)
    const encryptedId = EncryptDescrypt.encrypt(this.employee.userId.toString());
    this.router.navigate(['/ats/update-employee-details', encryptedId]);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.updateDatesAndFetchData();
  }

  updateDatesAndFetchData(): void {
    const currentDate = new Date();

    switch (this.activeTab) {
      case 'today':
        this.startDate = this.formatDate(currentDate);
        this.endDate = this.formatDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
        break;
      case 'yesterday':
        this.startDate = this.formatDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
        this.endDate = this.formatDate(currentDate);
        break;
      case 'dayBeforeYesterday':
        this.startDate = this.formatDate(new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000));
        this.endDate = this.formatDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
        break;
    }

    this.fetchActivityRecords();
  }

  fetchActivityRecords(): void {
    const encryptedId = this.route.snapshot.paramMap.get('id');
    if (encryptedId) {
      const employeeId = EncryptDescrypt.decrypt(encryptedId);

      this.attendanceLogService
        .getActivityRecordsInByUserId(employeeId, this.startDate, this.endDate)
        .subscribe((dataIn) => {
          this.activityInRecords = this.formatActivityRecords(dataIn);
        });

      this.attendanceLogService.getActivityRecordsOutByUserId(employeeId, this.startDate, this.endDate)
        .subscribe((dataOut) => {
          this.activityOutRecords = this.formatActivityRecords(dataOut);
        });
    }
  }

  loadMisEntriesData(): void {
    const encryptedId = this.route.snapshot.paramMap.get('id');
    if (encryptedId) {
      const employeeId = EncryptDescrypt.decrypt(encryptedId);
      const date = new Date().toISOString().slice(0, 10); // Format: YYYY-MM-DD
      this.attendanceLogService.getMisEntriesByUserId(employeeId, date).subscribe((data) => {
        this.misEntriesData = data;
        console.log("MisEntries", this.misEntriesData);
      });
    }
  }


  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  formatActivityRecords(records: ActivityRecordModel[]): ActivityRecordModel[] {
    return records.map(record => ({
      ...record
    }));
  }

  private subscribeToItemUpdates(employeeId: string): void {
    this.signalRService.itemUpdate$.subscribe(update => {
      if (update) {
        this.employeeService.getEmployeeByUserId(employeeId).subscribe(data => {
          this.employee = data![0]
        });

        // this.userService.getUserById(employeeId).subscribe(data => {
        //   this.user = data;
        // });

        this.fetchActivityRecords();
      }
    });
  }


  getEmployeeHoursByUserId(): void {
    const encryptedId = this.route.snapshot.paramMap.get('id');
    if (encryptedId) {
      const employeeId = EncryptDescrypt.decrypt(encryptedId);
      const startDate = moment().startOf('month').format('YYYY-MM-DD');
      const endDate = moment().endOf('month').format('YYYY-MM-DD');
      // const startDate = '2024-09-01';
      // const endDate = '2024-09-30';
      this.attendanceLogService.getEmployeeHoursByUserId(employeeId, startDate, endDate).subscribe((data) => {
        this.employeeHoursData = data;
        console.log("Employee hours daily data for a month", this.employeeHoursData);
        this.prepareChartData();
      });
    }
  }

  private prepareChartData(): void {
    const dateLabels = this.generateDateLabels();
    const dailyHours = dateLabels.map(date => {
      const dayData = this.employeeHoursData.find(entry => entry.currentDate === date);
      return dayData ? this.convertTimeToHours(dayData.totalHours) : 0;
    });

    this.lineChartDataJson = JSON.stringify({
      labels: dateLabels,
      datasets: [
        {
          label: 'Shift Hours',
          data: Array(dateLabels.length).fill(9),
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          fill: false,
          borderDash: [10, 5],
          pointRadius: 0,
        },
        {
          label: "Employee's Daily Hours",
          data: dailyHours,
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          fill: false,
        },
      ],
    });

    this.lineChartOptionsJson = JSON.stringify({
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const value = context.raw;
              const hours = Math.floor(value);
              const minutes = Math.round((value - hours) * 60);
              return `${hours} hours ${minutes} minutes`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    });
  }


  private generateDateLabels(): string[] {
    const currentMonth = moment().format('YYYY-MM');
    const daysInMonth = moment(currentMonth).daysInMonth();

    return Array.from({ length: daysInMonth }, (_, i) =>
      moment(`${currentMonth}-${i + 1}`).format('YYYY-MM-DD')
    );
  }


  private convertTimeToHours(time: string): number {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours + minutes / 60 + seconds / 3600;
  }

}
