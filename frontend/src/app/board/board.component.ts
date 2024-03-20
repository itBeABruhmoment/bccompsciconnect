import { Component } from '@angular/core';
import { TopicListComponent } from '../topic-list/topic-list.component';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [TopicListComponent],
  templateUrl: './board.component.html',
  styleUrl: './board.component.css'
})
/**
 * The main page for a board
 */
export class BoardComponent {

}