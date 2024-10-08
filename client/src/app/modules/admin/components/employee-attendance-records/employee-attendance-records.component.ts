import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { EncryptDescrypt } from '../../../../utils/genericFunction';
import { AttendanceLogService } from '../../../../services/attendanceLog/attendance-log.service';
import { SignalRService } from '../../../../services/signalR/signal-r.service';
import { ngxCsv } from 'ngx-csv';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-employee-attendance-records',
  templateUrl: './employee-attendance-records.component.html',
  styleUrls: ['./employee-attendance-records.component.css']
})
export class EmployeeAttendanceRecordsComponent implements OnInit {
  @Output() rowClicked = new EventEmitter<any>();
  employees: any[] = [];
  allEmployees: any[] = [];
  allSuggestions: { fullName: string; profilePic: string }[] = [];
  filteredSuggestions: { fullName: string; profilePic: string }[] = [];
  searchTerms: string[] = [];
  searchInput: string = '';

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const targetElement = event.target as HTMLElement;
    const searchBox = document.querySelector('.search-box');

    if (searchBox && !searchBox.contains(targetElement)) {
      this.filteredSuggestions = [];
    }
  }

  columns = [
    { key: 'fullName', label: 'Name' },
    { key: 'lastCheckInTime', label: 'In Time' },
    { key: 'lastCheckOutTime', label: 'Out Time' },
    { key: 'totalHours', label: 'Total Hours' }
  ];

  startDate: Date = new Date();
  endDate: Date = new Date();
  formattedStartDate = this.startDate.toLocaleDateString();
  formattedEndDate = this.startDate.toLocaleDateString();

  constructor(private router: Router, private attendanceLogService: AttendanceLogService, private signalRService: SignalRService) {}

  ngOnInit(): void {
    this.subscribeToItemUpdates();
    this.getAllEmployeeHours(); 
  }

  private subscribeToItemUpdates(): void {
    this.signalRService.itemUpdate$.subscribe(update => {
      console.log('Item update received:', update);
      if (update) {
        this.getAllEmployeeHours();
      }
    });
  }

  getAllEmployeeHours() {
    const reportType = 'Daily';
    this.attendanceLogService.getAllEmployeesHours(this.formattedStartDate, '', '').subscribe(data => {
      this.allEmployees = data;
      this.allSuggestions = this.allEmployees.map((employee) => ({
        fullName: employee.fullName,
        profilePic: employee.profilePic,
      }));
      this.performSearch();
      console.log("Employee Today's working hours Data:", this.allEmployees);
    });
  }

  onRowClicked(employee: any) {
    if (employee && employee.userId) {
      console.log(employee.userId);
      const encryptedId = EncryptDescrypt.encrypt(employee.userId.toString());
      this.router.navigate(['/ats/employee-detail', encryptedId]);
    } else {
      console.error('Employee ID is missing or data is incorrect');
    }
  }

  onInputChange() {
    this.filteredSuggestions = this.allSuggestions.filter((suggestion) =>
      suggestion.fullName
        .toLowerCase()
        .includes(this.searchInput.toLowerCase())
    );
  }

  addTerm() {
    const trimmedInput = this.searchInput.trim();
    const selectedSuggestion = this.allSuggestions.find(
      (suggestion) => suggestion.fullName === trimmedInput
    );
  
    if (trimmedInput && selectedSuggestion && !this.searchTerms.includes(trimmedInput)) {
      // Add the selected term to search terms
      this.searchTerms = [trimmedInput]; // Ensure only one term is added
      this.searchInput = '';
      this.filteredSuggestions = [];
      this.performSearch(); // Perform search with the updated term
    }
  }

  removeTerm(term: string) {
    this.searchTerms = this.searchTerms.filter(t => t !== term);
    this.performSearch();
  }

  selectSuggestion(suggestion: { fullName: string; profilePic: string }) {
    this.searchInput = suggestion.fullName;
    this.addTerm(); // Add the term and update search
  }
  

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && this.filteredSuggestions.length > 0) {
      this.selectSuggestion(this.filteredSuggestions[0]);
      event.preventDefault();
    }
  }

  performSearch() {
    if (this.searchTerms.length === 0) {
      this.employees = [...this.allEmployees];
    } else {
      this.employees = this.allEmployees.filter((employee) =>
        this.searchTerms.some((term) =>
          employee.fullName.toLowerCase().includes(term.toLowerCase())
        )
      );
    }
    console.log('Filtered employees:', this.employees);
  }

  exportToCSV() {
    const dataToExport = this.employees.map(({ id, fullName, lastCheckInTime,lastCheckOutTime, totalHours}) => ({
      'Employee Id': id,
      'Name': fullName,
      'In Time': lastCheckInTime,
      'Out Time': lastCheckOutTime,
      'Total Hours': totalHours
    }));

    const filename = 'emplyee-today-working-hours';

    const options = {
      filename: filename,
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true,
      showTitle: false,
      title: '',
      useBom: true,
      headers: ['Employee Id', 'Name', 'Email', 'Phone Number'],
      noDownload: false,
      removeEmptyValues: true,
    };

    new ngxCsv(dataToExport, options.filename, options);

    Swal.fire({
      icon: 'success',
      title: 'Export Successful',
      text: `Data has been successfully exported as ${filename}.csv`,
      timer: 3000
    });
  }
}
