import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'ds-featured-collection',
  styleUrls: ['./featured-collection.component.css'],
  templateUrl: './featured-collection.component.html'
})
export class FeaturedCollectionComponent implements OnInit {
  collection = {
    id: "ccd3951f-b311-4a57-957e-c47b923968bf",
    name: "A collection of must-see papers",
    shortDescription: "The most influential papers in this repository",
  };

  constructor() {
    this.universalInit();
  }

  universalInit() {

  }

  ngOnInit(): void {

  }
}
