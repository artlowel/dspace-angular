import { Component, OnInit } from '@angular/core';
import { HostWindowService } from "../shared/host-window.service";

@Component({
  selector: 'ds-home',
  styleUrls: ['./home.component.css'],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {

  constructor(
    private hws: HostWindowService
  ) {
    this.universalInit();
  }

  universalInit() {

  }

  ngOnInit(): void {
  }
}
