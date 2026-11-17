package team_261117_spring;

import com.fasterxml.jackson.annotation.JsonAlias;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data 
@NoArgsConstructor 
@AllArgsConstructor 
@Builder 
public class PriceDto {

    @JsonAlias("predicted_price")
    private Double price;

    private Integer progress;

    private String message;

}
